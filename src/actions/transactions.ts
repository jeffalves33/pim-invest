'use server'

import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity'
import { isApproval } from '@/lib/constants'
import { dbError } from '@/lib/form'
import { fmtMoney, fmtNum, todayISO } from '@/lib/format'
import { requireUser } from '@/lib/supabase/server'

export interface TransactionInput {
  asset_id: string
  type: 'buy' | 'sell'
  trade_date: string
  quantity: number
  price: number
  fees: number
  notes: string | null
  exception_justification: string | null
}

export async function addTransaction(input: TransactionInput) {
  const { supabase } = await requireUser()
  if (!(input.quantity > 0)) return { error: 'Quantidade deve ser maior que zero.' }
  if (!(input.price >= 0)) return { error: 'Preço inválido.' }
  if (!input.trade_date || input.trade_date > todayISO()) return { error: 'Data inválida.' }

  const [{ data: asset }, { data: thesis }, { data: pos }] = await Promise.all([
    supabase.from('assets').select('id, ticker, phase').eq('id', input.asset_id).single(),
    supabase.from('theses').select('id, max_buy_price, classification').eq('asset_id', input.asset_id).eq('status', 'current').maybeSingle(),
    supabase.from('v_positions').select('quantity').eq('asset_id', input.asset_id).maybeSingle(),
  ])
  if (!asset) return { error: 'Ativo não encontrado.' }

  let outside = false
  const reasons: string[] = []
  if (input.type === 'buy') {
    if (!thesis) reasons.push('sem tese vigente')
    else {
      if (!isApproval(thesis.classification)) reasons.push('classificação não é de compra')
      if (thesis.max_buy_price != null && input.price > Number(thesis.max_buy_price)) {
        reasons.push(`preço acima do máximo de ${fmtMoney(Number(thesis.max_buy_price))}`)
      }
    }
    outside = reasons.length > 0
    if (outside && !input.exception_justification?.trim()) {
      return { error: `Compra fora dos critérios (${reasons.join('; ')}). Escreva a justificativa da exceção.` }
    }
  } else {
    const held = Number(pos?.quantity ?? 0)
    if (input.quantity > held + 1e-9) return { error: `Quantidade maior que a posição (${fmtNum(held, 6, 0)}).` }
  }

  const { error } = await supabase.from('transactions').insert({
    asset_id: input.asset_id,
    thesis_id: thesis?.id ?? null,
    type: input.type,
    trade_date: input.trade_date,
    quantity: input.quantity,
    price: input.price,
    fees: input.fees || 0,
    notes: input.notes?.trim() || null,
    outside_criteria: outside,
    exception_justification: outside ? input.exception_justification!.trim() : null,
  })
  if (error) return { error: dbError(error) }

  if (input.type === 'buy' && asset.phase !== 'f5') {
    await supabase.from('assets').update({ phase: 'f5' }).eq('id', asset.id)
  }
  await logActivity(supabase, {
    action: input.type,
    asset_id: asset.id,
    thesis_id: thesis?.id ?? null,
    summary: `${input.type === 'buy' ? 'Compra' : 'Venda'} de ${fmtNum(input.quantity, 6, 0)} ${asset.ticker} a ${fmtMoney(input.price)}` +
      (outside ? ' — fora dos critérios' : ''),
    details: outside ? { reasons, justification: input.exception_justification } : null,
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function deleteTransaction(id: string) {
  const { supabase } = await requireUser()
  const { data: t } = await supabase.from('transactions').select('asset_id, type, quantity, price, assets(ticker)').eq('id', id).single()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error: dbError(error) }
  if (t) {
    const ticker = (t.assets as unknown as { ticker: string } | null)?.ticker ?? ''
    await logActivity(supabase, {
      action: 'transaction_deleted', asset_id: t.asset_id,
      summary: `${t.type === 'buy' ? 'Compra' : 'Venda'} de ${fmtNum(Number(t.quantity), 6, 0)} ${ticker} a ${fmtMoney(Number(t.price))} excluída`,
    })
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

export interface ProceedInput {
  asset_id: string
  kind: 'dividendo' | 'jcp' | 'rendimento' | 'outro'
  pay_date: string
  amount: number
  notes: string | null
}

export async function addProceed(input: ProceedInput) {
  const { supabase } = await requireUser()
  if (!(input.amount > 0)) return { error: 'Valor deve ser maior que zero.' }
  if (!input.pay_date) return { error: 'Informe a data de pagamento.' }
  const { data: asset } = await supabase.from('assets').select('ticker').eq('id', input.asset_id).single()
  const { error } = await supabase.from('proceeds').insert({ ...input, notes: input.notes?.trim() || null })
  if (error) return { error: dbError(error) }
  await logActivity(supabase, {
    action: 'proceed_added', asset_id: input.asset_id,
    summary: `${asset?.ticker ?? ''}: ${input.kind === 'jcp' ? 'JCP' : input.kind} de ${fmtMoney(input.amount)} recebido`,
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function deleteProceed(id: string) {
  const { supabase } = await requireUser()
  const { data: p } = await supabase.from('proceeds').select('asset_id, amount').eq('id', id).single()
  const { error } = await supabase.from('proceeds').delete().eq('id', id)
  if (error) return { error: dbError(error) }
  await logActivity(supabase, { action: 'proceed_deleted', asset_id: p?.asset_id ?? null, summary: `Provento de ${fmtMoney(Number(p?.amount ?? 0))} excluído` })
  revalidatePath('/', 'layout')
  return { ok: true }
}
