import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { QUOTABLE_CLASSES, fetchQuote } from '@/lib/quotes'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Atualiza as cotações de todos os ativos de bolsa que não estão encerrados.
 * Chamado pelo cron da Vercel (vercel.json) com "Authorization: Bearer CRON_SECRET".
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' }, { status: 500 })
  }

  const supabase = createAdminClient()
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, user_id, ticker, asset_class, phase')
    .neq('phase', 'f6')
    .in('asset_class', QUOTABLE_CLASSES)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { ticker: string; ok: boolean; price?: number; error?: string }[] = []
  // cache por ticker (mais de um usuário pode ter o mesmo ativo)
  const cache = new Map<string, Awaited<ReturnType<typeof fetchQuote>> | Error>()

  for (const a of assets ?? []) {
    let q = cache.get(a.ticker)
    if (!q) {
      try { q = await fetchQuote(a.ticker) } catch (e) { q = e instanceof Error ? e : new Error(String(e)) }
      cache.set(a.ticker, q)
    }
    if (q instanceof Error) { results.push({ ticker: a.ticker, ok: false, error: q.message }); continue }

    const patch: Record<string, unknown> = {
      current_price: q.price, price_date: q.date, price_source: q.source, price_updated_at: new Date().toISOString(),
    }
    if (q.marketCap != null) patch.market_cap = q.marketCap
    await supabase.from('assets').update(patch).eq('id', a.id)
    await supabase.from('price_history').upsert(
      { user_id: a.user_id, asset_id: a.id, price_date: q.date, price: q.price, source: q.source },
      { onConflict: 'asset_id,price_date' },
    )
    results.push({ ticker: a.ticker, ok: true, price: q.price })
  }

  return NextResponse.json({ updated: results.filter((r) => r.ok).length, results })
}
