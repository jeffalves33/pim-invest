import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import ThesisEditor, { type EditorInitial } from '@/components/ThesisEditor'
import { Page, PageHeader } from '@/components/ui'
import { THESIS_FULL_SELECT, normalizeThesis } from '@/lib/data'
import { todayISO } from '@/lib/format'
import { requireUser } from '@/lib/supabase/server'
import { THESIS_CORE_KEYS, emptyThesisCore, type Asset, type Thesis, type ThesisCore } from '@/lib/types'

export const metadata: Metadata = { title: 'Nova análise' }
export const dynamic = 'force-dynamic'

/** Abre uma nova versão: continua o rascunho existente ou parte da tese vigente. */
export default async function NovaTese({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireUser()
  const today = todayISO()

  const [{ data: assetData }, { data: theses }] = await Promise.all([
    supabase.from('assets').select('*').eq('id', id).maybeSingle(),
    supabase.from('theses').select(THESIS_FULL_SELECT).eq('asset_id', id).in('status', ['draft', 'current']),
  ])
  if (!assetData) notFound()
  const asset = assetData as Asset
  const list = (theses ?? []) as Thesis[]
  const draft = list.find((t) => t.status === 'draft')
  if (draft) redirect(`/teses/${draft.id}/editar`)
  const currentRaw = list.find((t) => t.status === 'current')
  const current = currentRaw ? normalizeThesis(currentRaw) : null

  const base: ThesisCore = emptyThesisCore()
  if (current) for (const k of THESIS_CORE_KEYS) (base as unknown as Record<string, unknown>)[k] = current[k]
  // Uma nova versão parte da anterior, com data e cotação de hoje
  base.analysis_date = today
  base.next_review = null
  base.price_at_analysis = asset.current_price
  base.price_ref_date = asset.price_date
  if (!current) base.dossier_url = null

  const strip = <T extends { id?: string }>(l: T[] = []) => l.map(({ id: _id, ...rest }) => rest as T)
  const initial: EditorInitial = {
    id: null,
    version: null,
    status: 'new',
    core: base,
    indicators: strip(current?.thesis_indicators),
    triggers: strip(current?.thesis_triggers),
    events: strip(current?.thesis_events).filter((e) => e.event_date >= today && !e.done),
    risks: strip(current?.thesis_risks),
  }

  return (
    <>
      <PageHeader back={`/ativos/${id}`} title={`${asset.ticker} · nova análise`} subtitle={current ? `parte da v${current.version}` : 'primeira versão'} />
      <Page>
        <ThesisEditor assetId={asset.id} ticker={asset.ticker} currentPrice={asset.current_price} initial={initial} />
      </Page>
    </>
  )
}
