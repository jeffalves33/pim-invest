'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logActivity } from '@/lib/activity'
import { autoMaxBuy } from '@/lib/calc'
import { classificationLabel, phaseFromClassification, phaseLabel } from '@/lib/constants'
import { dbError } from '@/lib/form'
import { fmtNum } from '@/lib/format'
import { requireUser } from '@/lib/supabase/server'
import { THESIS_CORE_KEYS, type ThesisCore, type ThesisInput } from '@/lib/types'

type SaveResult = { ok: true; id: string; version: number } | { ok?: false; error: string }

const clean = (s: unknown) => (typeof s === 'string' ? s.trim() || null : s ?? null)

function sanitizeCore(core: ThesisCore): ThesisCore {
  const out = {} as Record<string, unknown>
  for (const k of THESIS_CORE_KEYS) out[k] = clean(core[k])
  const c = out as unknown as ThesisCore
  c.max_buy_manual = Boolean(core.max_buy_manual)
  if (!c.max_buy_manual) c.max_buy_price = autoMaxBuy(c.fair_value_base, c.safety_margin)
  return c
}

function validateForConclusion(c: ThesisCore): string | null {
  const missing: string[] = []
  if (!c.analysis_date) missing.push('data da análise')
  if (!c.next_review) missing.push('próxima revisão')
  if (!c.classification) missing.push('classificação')
  if (!c.opportunity) missing.push('oportunidade')
  if (!c.invalidation) missing.push('invalidação')
  if (!c.justification) missing.push('justificativa')
  if (missing.length) return `Para concluir, preencha: ${missing.join(', ')}.`
  const { fair_value_pess: p, fair_value_base: b, fair_value_opt: o } = c
  if (p != null && b != null && p > b) return 'O valor justo pessimista não pode ser maior que o base.'
  if (b != null && o != null && b > o) return 'O valor justo base não pode ser maior que o otimista.'
  if (c.safety_margin != null && (c.safety_margin < 0 || c.safety_margin >= 100)) return 'Margem de segurança deve ficar entre 0 e 99%.'
  return null
}

/**
 * Salva a tese. Sem `conclude`, grava como rascunho (ou corrige uma versão já
 * concluída, mantendo o status). Com `conclude`, a versão vira a vigente e a
 * anterior passa a "superseded" (trigger no banco).
 */
export async function saveThesis(input: ThesisInput, conclude: boolean): Promise<SaveResult> {
  const { supabase } = await requireUser()
  const core = sanitizeCore(input.core)

  if (conclude) {
    const err = validateForConclusion(core)
    if (err) return { error: err }
  } else {
    const { fair_value_pess: p, fair_value_base: b, fair_value_opt: o } = core
    if ((p != null && b != null && p > b) || (b != null && o != null && b > o)) {
      return { error: 'Os valores justos devem seguir a ordem pessimista ≤ base ≤ otimista.' }
    }
  }

  const { data: asset } = await supabase.from('assets').select('id, ticker, phase, current_price, price_date').eq('id', input.asset_id).single()
  if (!asset) return { error: 'Ativo não encontrado.' }

  let id = input.id ?? null
  let version = input.version ?? null
  let prevStatus: string | null = null

  if (id) {
    const { data: existing } = await supabase.from('theses').select('status, version').eq('id', id).single()
    if (!existing) return { error: 'Versão não encontrada.' }
    prevStatus = existing.status
    version = existing.version
    const status = conclude ? 'current' : existing.status
    const { error } = await supabase.from('theses').update({ ...core, status }).eq('id', id)
    if (error) return { error: dbError(error) }
  } else {
    const { data, error } = await supabase
      .from('theses')
      .insert({ ...core, asset_id: input.asset_id, status: conclude ? 'current' : 'draft', ...(version ? { version } : {}) })
      .select('id, version')
      .single()
    if (error) {
      return { error: error.code === '23505' ? 'Já existe uma análise em andamento ou essa versão já existe para este ativo.' : dbError(error) }
    }
    id = data.id as string
    version = data.version as number
  }

  // Itens: substitui o conjunto inteiro
  const tid = id as string
  const tables = ['thesis_indicators', 'thesis_triggers', 'thesis_events', 'thesis_risks'] as const
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().eq('thesis_id', tid)
    if (error) return { error: dbError(error) }
  }
  const indicators = input.indicators
    .filter((i) => i.name?.trim())
    .map((i, n) => ({ thesis_id: tid, name: i.name.trim(), value: i.value, period: clean(i.period), note: clean(i.note), is_custom: !!i.is_custom, sort: n }))
  const triggers = input.triggers
    .filter((g) => g.indicator?.trim() && g.limit_value != null)
    .map((g, n) => ({ thesis_id: tid, indicator: g.indicator.trim(), condition: g.condition, limit_value: g.limit_value, current_value: g.current_value, value_date: g.value_date || null, sort: n }))
  const events = input.events
    .filter((e) => e.event_date && e.description?.trim())
    .map((e) => ({ thesis_id: tid, event_date: e.event_date, description: e.description.trim(), done: !!e.done }))
  const risks = input.risks
    .filter((r) => r.description?.trim())
    .map((r, n) => ({ thesis_id: tid, description: r.description.trim(), category: clean(r.category), probability: r.probability, impact: r.impact, notes: clean(r.notes), sort: n }))

  for (const [table, rows] of [
    ['thesis_indicators', indicators], ['thesis_triggers', triggers], ['thesis_events', events], ['thesis_risks', risks],
  ] as const) {
    if (rows.length) {
      const { error } = await supabase.from(table).insert(rows as Record<string, unknown>[])
      if (error) return { error: `${table}: ${dbError(error)}` }
    }
  }

  if (conclude) {
    const patch: Record<string, unknown> = {}
    const target = phaseFromClassification(core.classification)
    if (target && asset.phase !== 'f5' && asset.phase !== target) patch.phase = target
    if (core.price_at_analysis != null && core.price_ref_date && (!asset.price_date || asset.price_date < core.price_ref_date)) {
      patch.current_price = core.price_at_analysis
      patch.price_date = core.price_ref_date
      patch.price_source = 'análise'
      patch.price_updated_at = new Date().toISOString()
    }
    if (Object.keys(patch).length) await supabase.from('assets').update(patch).eq('id', asset.id)
    if (patch.current_price != null) {
      await supabase.from('price_history').upsert(
        { asset_id: asset.id, price_date: core.price_ref_date, price: core.price_at_analysis, source: 'análise' },
        { onConflict: 'asset_id,price_date' },
      )
    }
    await logActivity(supabase, {
      action: prevStatus === 'current' ? 'thesis_corrected' : 'thesis_concluded',
      asset_id: asset.id, thesis_id: tid,
      summary: `${asset.ticker}: tese v${version} concluída — ${classificationLabel(core.classification)}` +
        (core.max_buy_price != null ? `, preço máximo R$ ${fmtNum(core.max_buy_price)}` : '') +
        (patch.phase ? ` · fase ${phaseLabel(patch.phase as string)}` : ''),
    })
  } else {
    await logActivity(supabase, {
      action: prevStatus && prevStatus !== 'draft' ? 'thesis_corrected' : 'thesis_draft_saved',
      asset_id: asset.id, thesis_id: tid,
      summary: prevStatus && prevStatus !== 'draft'
        ? `${asset.ticker}: correção na tese v${version}`
        : `${asset.ticker}: rascunho da tese v${version} salvo`,
    })
  }

  revalidatePath('/', 'layout')
  return { ok: true, id: tid, version: version as number }
}

export async function deleteDraft(thesisId: string) {
  const { supabase } = await requireUser()
  const { data: t } = await supabase.from('theses').select('asset_id, status, version, assets(ticker)').eq('id', thesisId).single()
  if (!t) return { error: 'Rascunho não encontrado.' }
  if (t.status !== 'draft') return { error: 'Só rascunhos podem ser descartados.' }
  const { error } = await supabase.from('theses').delete().eq('id', thesisId)
  if (error) return { error: dbError(error) }
  const ticker = (t.assets as unknown as { ticker: string } | null)?.ticker ?? ''
  await logActivity(supabase, { action: 'thesis_draft_deleted', asset_id: t.asset_id, summary: `${ticker}: rascunho v${t.version} descartado` })
  revalidatePath('/', 'layout')
  redirect(`/ativos/${t.asset_id}`)
}

export async function updateTrigger(triggerId: string, currentValue: number | null, valueDate: string | null) {
  const { supabase } = await requireUser()
  const { data: g, error } = await supabase
    .from('thesis_triggers')
    .update({ current_value: currentValue, value_date: valueDate })
    .eq('id', triggerId)
    .select('indicator, theses(asset_id)')
    .single()
  if (error) return { error: dbError(error) }
  const assetId = (g.theses as unknown as { asset_id: string } | null)?.asset_id ?? null
  await logActivity(supabase, {
    action: 'trigger_updated', asset_id: assetId,
    summary: `Gatilho "${g.indicator}" atualizado para ${currentValue == null ? '—' : fmtNum(currentValue)}`,
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function toggleEventDone(eventId: string, done: boolean) {
  const { supabase } = await requireUser()
  const { data: e, error } = await supabase
    .from('thesis_events')
    .update({ done })
    .eq('id', eventId)
    .select('description, theses(asset_id)')
    .single()
  if (error) return { error: dbError(error) }
  if (done) {
    await logActivity(supabase, {
      action: 'event_done',
      asset_id: (e.theses as unknown as { asset_id: string } | null)?.asset_id ?? null,
      summary: `Evento acompanhado: ${e.description}`,
    })
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}
