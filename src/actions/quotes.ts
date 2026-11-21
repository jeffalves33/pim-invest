'use server'

import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity'
import { date, dbError, num, type FormState } from '@/lib/form'
import { fmtDate, fmtMoney, todayISO } from '@/lib/format'
import { QUOTABLE_CLASSES, fetchQuote } from '@/lib/quotes'
import { requireUser } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

async function savePrice(
  supabase: SupabaseClient,
  assetId: string,
  price: number,
  priceDate: string,
  source: string,
  marketCap?: number | null,
  log = true,
) {
  const patch: Record<string, unknown> = {
    current_price: price,
    price_date: priceDate,
    price_source: source,
    price_updated_at: new Date().toISOString(),
  }
  if (marketCap != null) patch.market_cap = marketCap
  const { data, error } = await supabase.from('assets').update(patch).eq('id', assetId).select('ticker').single()
  if (error) return { error: dbError(error) }
  await supabase
    .from('price_history')
    .upsert({ asset_id: assetId, price_date: priceDate, price, source }, { onConflict: 'asset_id,price_date' })
  if (log) await logActivity(supabase, {
    action: 'price_updated', asset_id: assetId,
    summary: `${data.ticker}: cotação ${fmtMoney(price)} em ${fmtDate(priceDate)} (${source})`,
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function updatePriceManual(assetId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser()
  const price = num(fd, 'price')
  const d = date(fd, 'price_date') ?? todayISO()
  if (price == null || price <= 0) return { error: 'Informe uma cotação válida.' }
  if (d > todayISO()) return { error: 'A data da cotação não pode estar no futuro.' }
  const r = await savePrice(supabase, assetId, price, d, 'manual')
  return 'error' in r ? { error: r.error } : { ok: true, message: 'Cotação atualizada.' }
}

/** Atualiza todos os ativos de bolsa que não estão encerrados (uma chamada por ticker). */
export async function refreshAllQuotes(): Promise<FormState> {
  const { supabase } = await requireUser()
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, ticker')
    .neq('phase', 'f6')
    .in('asset_class', QUOTABLE_CLASSES)
    .order('ticker')
  if (error) return { error: dbError(error) }
  if (!assets?.length) return { error: 'Nenhum ativo de bolsa para atualizar.' }

  const ok: string[] = []
  const fail: string[] = []
  for (const a of assets as { id: string; ticker: string }[]) {
    try {
      const q = await fetchQuote(a.ticker)
      const r = await savePrice(supabase, a.id, q.price, q.date, q.source, q.marketCap, false)
      if ('error' in r) fail.push(a.ticker)
      else ok.push(a.ticker)
    } catch (e) {
      fail.push(a.ticker)
      // token ausente/inválido ou limite: não adianta tentar os demais
      if (e instanceof Error && /token|Limite/i.test(e.message)) return { error: e.message }
    }
  }
  await logActivity(supabase, {
    action: 'price_updated',
    summary: `Cotações atualizadas (brapi): ${ok.length} de ${assets.length}${fail.length ? ` · falharam ${fail.join(', ')}` : ''}`,
  })
  revalidatePath('/', 'layout')
  return fail.length && !ok.length
    ? { error: `Não foi possível atualizar: ${fail.join(', ')}.` }
    : { ok: true, message: `${ok.length} cotação(ões) atualizada(s)${fail.length ? `; falharam ${fail.join(', ')}` : ''}.` }
}

export async function refreshQuote(assetId: string): Promise<FormState> {
  const { supabase } = await requireUser()
  const { data: asset } = await supabase.from('assets').select('ticker').eq('id', assetId).single()
  if (!asset) return { error: 'Ativo não encontrado.' }
  try {
    const q = await fetchQuote(asset.ticker)
    const r = await savePrice(supabase, assetId, q.price, q.date, q.source, q.marketCap)
    return 'error' in r ? { error: r.error } : { ok: true, message: `${fmtMoney(q.price)} em ${fmtDate(q.date)}` }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Falha ao buscar a cotação.' }
  }
}
