'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logActivity } from '@/lib/activity'
import { ASSET_CLASSES, PHASES, phaseLabel } from '@/lib/constants'
import { dbError, num, str, type FormState } from '@/lib/form'
import { requireUser } from '@/lib/supabase/server'
import type { Phase } from '@/lib/types'

function assetFromForm(fd: FormData) {
  const ticker = (str(fd, 'ticker') ?? '').toUpperCase().replace(/\s+/g, '')
  const asset_class = str(fd, 'asset_class') ?? 'acao'
  const phase = (str(fd, 'phase') ?? 'f1') as Phase
  const mcBi = num(fd, 'market_cap_bi')
  return {
    ticker,
    name: str(fd, 'name') ?? '',
    related_tickers: str(fd, 'related_tickers'),
    asset_class: ASSET_CLASSES.some((c) => c.key === asset_class) ? asset_class : 'acao',
    sector: str(fd, 'sector'),
    category: str(fd, 'category'),
    market: str(fd, 'market'),
    currency: str(fd, 'currency') ?? 'BRL',
    country: str(fd, 'country') ?? 'Brasil',
    website: str(fd, 'website'),
    ri_site: str(fd, 'ri_site'),
    description: str(fd, 'description'),
    notes: str(fd, 'notes'),
    phase: PHASES.some((p) => p.key === phase) ? phase : 'f1',
    market_cap: mcBi == null ? null : Math.round(mcBi * 1e9),
  }
}

export async function createAsset(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser()
  const a = assetFromForm(fd)
  if (!/^[A-Z0-9.\-]{2,15}$/.test(a.ticker)) return { error: 'Ticker inválido.' }
  if (!a.name) return { error: 'Informe o nome do ativo.' }

  const { data, error } = await supabase.from('assets').insert(a).select('id').single()
  if (error) return { error: error.code === '23505' ? `${a.ticker} já está cadastrado.` : dbError(error) }

  await logActivity(supabase, { action: 'asset_created', asset_id: data.id, summary: `${a.ticker} cadastrado em ${phaseLabel(a.phase)}` })
  revalidatePath('/', 'layout')
  redirect(`/ativos/${data.id}`)
}

export async function updateAsset(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser()
  const a = assetFromForm(fd)
  if (!/^[A-Z0-9.\-]{2,15}$/.test(a.ticker)) return { error: 'Ticker inválido.' }
  if (!a.name) return { error: 'Informe o nome do ativo.' }

  const { data: before } = await supabase.from('assets').select('phase').eq('id', id).single()
  const { error } = await supabase.from('assets').update(a).eq('id', id)
  if (error) return { error: dbError(error) }

  await logActivity(supabase, { action: 'asset_updated', asset_id: id, summary: `Cadastro de ${a.ticker} atualizado` })
  if (before && before.phase !== a.phase) {
    await logActivity(supabase, {
      action: 'phase_changed', asset_id: id,
      summary: `${a.ticker}: ${phaseLabel(before.phase)} → ${phaseLabel(a.phase)}`,
    })
  }
  revalidatePath('/', 'layout')
  redirect(`/ativos/${id}`)
}

export async function setPhase(id: string, phase: Phase) {
  const { supabase } = await requireUser()
  if (!PHASES.some((p) => p.key === phase)) return { error: 'Fase inválida.' }
  const { data: before } = await supabase.from('assets').select('ticker, phase').eq('id', id).single()
  if (!before) return { error: 'Ativo não encontrado.' }
  if (before.phase === phase) return { ok: true }
  const { error } = await supabase.from('assets').update({ phase }).eq('id', id)
  if (error) return { error: dbError(error) }
  await logActivity(supabase, {
    action: 'phase_changed', asset_id: id,
    summary: `${before.ticker}: ${phaseLabel(before.phase)} → ${phaseLabel(phase)}`,
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function deleteAsset(id: string) {
  const { supabase } = await requireUser()
  const { data: a } = await supabase.from('assets').select('ticker').eq('id', id).single()
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) return { error: dbError(error) }
  await logActivity(supabase, { action: 'asset_deleted', summary: `${a?.ticker ?? 'Ativo'} excluído com todo o histórico` })
  revalidatePath('/', 'layout')
  redirect('/ativos')
}
