import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Pencil } from 'lucide-react'
import CopyFicha from '@/components/CopyFicha'
import EventItem from '@/components/EventItem'
import { DecisionCard, PriceCard, ThesisBody, ValidityCard } from '@/components/ThesisSections'
import TriggerRow from '@/components/TriggerRow'
import { Badge, Collapsible, Divided, Notice, Page, PageHeader, Section } from '@/components/ui'
import { THESIS_FULL_SELECT, normalizeThesis } from '@/lib/data'
import { thesisToFicha } from '@/lib/ficha-format'
import { fmtDate, fmtDateTime, todayISO } from '@/lib/format'
import { requireUser } from '@/lib/supabase/server'
import type { Asset, Thesis } from '@/lib/types'

export const metadata: Metadata = { title: 'Versão da tese' }
export const dynamic = 'force-dynamic'

export default async function VersaoTese({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireUser()
  const { data } = await supabase.from('theses').select(THESIS_FULL_SELECT).eq('id', id).maybeSingle()
  if (!data) notFound()
  const t = normalizeThesis(data as Thesis)
  if (t.status === 'draft') redirect(`/teses/${t.id}/editar`)
  const { data: assetData } = await supabase.from('assets').select('*').eq('id', t.asset_id).single()
  const asset = assetData as Asset
  const today = todayISO()
  const isCurrent = t.status === 'current'

  const ficha = thesisToFicha({
    version: t.version, core: t, indicators: t.thesis_indicators ?? [], triggers: t.thesis_triggers ?? [],
    events: t.thesis_events ?? [], risks: t.thesis_risks ?? [],
  })

  return (
    <>
      <PageHeader
        back={`/ativos/${asset.id}`}
        title={`${asset.ticker} · v${t.version}`}
        subtitle={`análise de ${fmtDate(t.analysis_date)}`}
        actions={<Link href={`/teses/${t.id}/editar`} aria-label="Corrigir" className="rounded-full p-2 text-ink2 active:bg-surface2"><Pencil size={19} /></Link>}
      />
      <Page>
        <div className="flex items-center gap-2">
          <Badge tone={isCurrent ? 'ok' : 'muted'}>{isCurrent ? 'Vigente' : 'Versão anterior'}</Badge>
          {t.concluded_at && <span className="text-xs text-ink3">concluída em {fmtDateTime(t.concluded_at)}</span>}
        </div>
        {!isCurrent && (
          <Notice tone="muted">Registro histórico. Os números abaixo refletem a cotação da época da análise.</Notice>
        )}
        <DecisionCard t={t} />
        <PriceCard
          t={t}
          price={isCurrent ? asset.current_price : t.price_at_analysis}
          currency={asset.currency}
          label={isCurrent ? 'Cotação atual' : 'Cotação na análise'}
        />
        <ValidityCard t={t} today={today} />
        {(t.thesis_triggers ?? []).length > 0 && (
          <Section title="Gatilhos">
            <Divided>{t.thesis_triggers!.map((g) => <TriggerRow key={g.id} trigger={g} today={today} editable={isCurrent} />)}</Divided>
          </Section>
        )}
        {(t.thesis_events ?? []).length > 0 && (
          <Section title="Eventos">
            <Divided>{t.thesis_events!.map((e) => <EventItem key={e.id} event={e} today={today} editable={isCurrent} />)}</Divided>
          </Section>
        )}
        <ThesisBody t={t} currency={asset.currency} />
        <Collapsible title="Ficha em texto (Seção M)">
          <CopyFicha text={ficha} filename={`${asset.ticker}_ficha_v${t.version}.txt`} />
        </Collapsible>
      </Page>
    </>
  )
}
