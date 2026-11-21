import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssetBundle } from './calc'
import type { Asset, Position, Thesis } from './types'

const byDate = <T extends { event_date: string }>(a: T, b: T) => a.event_date.localeCompare(b.event_date)
const bySort = <T extends { sort?: number }>(a: T, b: T) => (a.sort ?? 0) - (b.sort ?? 0)

export function normalizeThesis(t: Thesis): Thesis {
  return {
    ...t,
    thesis_indicators: [...(t.thesis_indicators ?? [])].sort(bySort),
    thesis_triggers: [...(t.thesis_triggers ?? [])].sort(bySort),
    thesis_events: [...(t.thesis_events ?? [])].sort(byDate),
    thesis_risks: [...(t.thesis_risks ?? [])].sort(bySort),
  }
}

/** Todos os ativos com a tese vigente e o rascunho, se houver. */
export async function loadBundles(supabase: SupabaseClient): Promise<AssetBundle[]> {
  const [assetsRes, thesesRes] = await Promise.all([
    supabase.from('assets').select('*').order('ticker'),
    supabase
      .from('theses')
      .select('*, thesis_triggers(*), thesis_events(*)')
      .in('status', ['current', 'draft']),
  ])
  if (assetsRes.error) throw new Error(assetsRes.error.message)
  if (thesesRes.error) throw new Error(thesesRes.error.message)

  const theses = ((thesesRes.data ?? []) as Thesis[]).map((t) => normalizeThesis(t))
  return (assetsRes.data as Asset[]).map((asset) => ({
    asset,
    current: theses.find((t) => t.asset_id === asset.id && t.status === 'current') ?? null,
    draft: theses.find((t) => t.asset_id === asset.id && t.status === 'draft') ?? null,
  }))
}

export async function loadPositions(supabase: SupabaseClient): Promise<Position[]> {
  const { data, error } = await supabase.from('v_positions').select('*').order('ticker')
  if (error) throw new Error(error.message)
  type Raw = Record<string, unknown> & { quantity: unknown; avg_cost: unknown; invested: unknown; market_value: unknown; realized_pnl: unknown; proceeds_received: unknown; current_price: unknown }
  const n = (v: unknown) => (v == null ? null : Number(v))
  return ((data ?? []) as Raw[]).map((p) => ({
    ...p,
    quantity: Number(p.quantity),
    avg_cost: n(p.avg_cost),
    invested: n(p.invested),
    market_value: n(p.market_value),
    realized_pnl: n(p.realized_pnl),
    proceeds_received: Number(p.proceeds_received ?? 0),
    current_price: n(p.current_price),
  })) as unknown as Position[]
}

export const THESIS_FULL_SELECT =
  '*, thesis_indicators(*), thesis_triggers(*), thesis_events(*), thesis_risks(*)'
