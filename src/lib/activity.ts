import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ActivityAction =
  | 'asset_created' | 'asset_updated' | 'asset_deleted' | 'phase_changed'
  | 'thesis_draft_saved' | 'thesis_concluded' | 'thesis_corrected' | 'thesis_draft_deleted'
  | 'trigger_updated' | 'event_done'
  | 'price_updated' | 'buy' | 'sell' | 'transaction_deleted' | 'proceed_added' | 'proceed_deleted'

export async function logActivity(
  supabase: SupabaseClient,
  entry: {
    action: ActivityAction
    summary: string
    asset_id?: string | null
    thesis_id?: string | null
    details?: Record<string, unknown> | null
  },
) {
  // O log não pode derrubar a operação principal.
  await supabase.from('activity_log').insert({
    action: entry.action,
    summary: entry.summary,
    asset_id: entry.asset_id ?? null,
    thesis_id: entry.thesis_id ?? null,
    details: entry.details ?? null,
  })
}
