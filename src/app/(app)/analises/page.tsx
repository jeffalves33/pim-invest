import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, Divided, Empty, Page, PageHeader, Section } from '@/components/ui'
import { classificationLabel, classificationTone, phaseLabel } from '@/lib/constants'
import { daysBetween, fmtCountdown, fmtDate, fmtDateTime, fmtMoney, todayISO } from '@/lib/format'
import { requireUser } from '@/lib/supabase/server'
import type { Asset, Thesis } from '@/lib/types'

export const metadata: Metadata = { title: 'Análises' }
export const dynamic = 'force-dynamic'

type Row = Pick<Thesis, 'id' | 'asset_id' | 'version' | 'status' | 'analysis_date' | 'next_review' | 'classification' | 'updated_at' | 'concluded_at' | 'fair_value_base' | 'max_buy_price'>

export default async function Analises() {
  const { supabase } = await requireUser()
  const today = todayISO()
  const [{ data: assetsData }, { data: thesesData }] = await Promise.all([
    supabase.from('assets').select('id, ticker, name, phase').order('ticker'),
    supabase
      .from('theses')
      .select('id, asset_id, version, status, analysis_date, next_review, classification, updated_at, concluded_at, fair_value_base, max_buy_price')
      .order('version', { ascending: false }),
  ])
  const assets = (assetsData ?? []) as Pick<Asset, 'id' | 'ticker' | 'name' | 'phase'>[]
  const theses = (thesesData ?? []) as Row[]
  const tk = (id: string) => assets.find((a) => a.id === id)?.ticker ?? '—'

  const drafts = theses.filter((t) => t.status === 'draft')
  const current = theses
    .filter((t) => t.status === 'current')
    .sort((a, b) => (a.next_review ?? '9999').localeCompare(b.next_review ?? '9999'))
  const old = theses.filter((t) => t.status === 'superseded')
  const withThesis = new Set(theses.filter((t) => t.status !== 'superseded').map((t) => t.asset_id))
  const without = assets.filter((a) => !withThesis.has(a.id) && a.phase !== 'f6')

  return (
    <>
      <PageHeader title="Análises" subtitle={`${current.length} vigentes · ${drafts.length} em andamento`} />
      <Page>
        {theses.length === 0 && without.length === 0 && <Empty>Nenhuma análise ainda.</Empty>}

        {drafts.length > 0 && (
          <Section title="Em andamento">
            <Divided>
              {drafts.map((t) => (
                <Link key={t.id} href={`/teses/${t.id}/editar`} className="block px-4 py-3 active:bg-surface2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{tk(t.asset_id)}</span>
                    <Badge tone="info">v{t.version} rascunho</Badge>
                  </div>
                  <div className="num mt-0.5 text-xs text-ink3">Salvo em {fmtDateTime(t.updated_at)}</div>
                </Link>
              ))}
            </Divided>
          </Section>
        )}

        {current.length > 0 && (
          <Section title="Vigentes" action={<span className="text-2xs text-ink3">por próxima revisão</span>}>
            <Divided>
              {current.map((t) => {
                const d = t.next_review ? daysBetween(today, t.next_review) : null
                const tone = d == null ? 'text-ink3' : d < 0 ? 'text-bad' : d <= 15 ? 'text-warn' : 'text-ink3'
                return (
                  <Link key={t.id} href={`/teses/${t.id}`} className="block px-4 py-3 active:bg-surface2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{tk(t.asset_id)}</span>
                      <span className="num text-xs text-ink3">v{t.version}</span>
                      <Badge tone={classificationTone(t.classification)}>{classificationLabel(t.classification)}</Badge>
                    </div>
                    <div className="num mt-1 grid grid-cols-2 gap-x-3 text-xs">
                      <span className="text-ink3">Análise {fmtDate(t.analysis_date)}</span>
                      <span className={tone}>Revisão {fmtDate(t.next_review)}{d != null ? ` · ${fmtCountdown(d)}` : ''}</span>
                      <span className="text-ink3">Base {fmtMoney(t.fair_value_base)}</span>
                      <span className="text-ink3">Teto {fmtMoney(t.max_buy_price)}</span>
                    </div>
                  </Link>
                )
              })}
            </Divided>
          </Section>
        )}

        {without.length > 0 && (
          <Section title="Sem tese">
            <Divided>
              {without.map((a) => (
                <Link key={a.id} href={`/ativos/${a.id}/tese`} className="flex items-center gap-3 px-4 py-3 active:bg-surface2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{a.ticker}</div>
                    <div className="text-xs text-ink3">{a.name} · {phaseLabel(a.phase)}</div>
                  </div>
                  <span className="text-sm font-medium text-accent">Iniciar</span>
                </Link>
              ))}
            </Divided>
          </Section>
        )}

        {old.length > 0 && (
          <Section title="Versões anteriores">
            <Divided>
              {old.map((t) => (
                <Link key={t.id} href={`/teses/${t.id}`} className="block px-4 py-3 active:bg-surface2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{tk(t.asset_id)}</span>
                    <span className="num text-xs text-ink3">v{t.version}</span>
                    <span className="text-sm text-ink2">{classificationLabel(t.classification)}</span>
                  </div>
                  <div className="num mt-0.5 text-xs text-ink3">Análise {fmtDate(t.analysis_date)} · base {fmtMoney(t.fair_value_base)}</div>
                </Link>
              ))}
            </Divided>
          </Section>
        )}
      </Page>
    </>
  )
}
