import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, FilePlus2, Pencil, Trash2 } from 'lucide-react'
import { deleteProceed, deleteTransaction } from '@/actions/transactions'
import ConfirmButton from '@/components/ConfirmButton'
import CopyFicha from '@/components/CopyFicha'
import EventItem from '@/components/EventItem'
import PhaseSelect from '@/components/PhaseSelect'
import PriceUpdateForm from '@/components/PriceUpdateForm'
import QuoteRefreshButton from '@/components/QuoteRefreshButton'
import ProceedForm from '@/components/ProceedForm'
import { DecisionCard, PriceCard, ThesisBody, ValidityCard } from '@/components/ThesisSections'
import TransactionForm from '@/components/TransactionForm'
import TriggerRow from '@/components/TriggerRow'
import {
  Badge, Collapsible, Divided, Empty, Field, Notice, Page, PageHeader, Section, Stat,
} from '@/components/ui'
import { priceMetrics, triggerState } from '@/lib/calc'
import {
  STALE_PRICE_BUSINESS_DAYS, assetClassLabel, classificationLabel, isApproval,
} from '@/lib/constants'
import { THESIS_FULL_SELECT, normalizeThesis } from '@/lib/data'
import { thesisToFicha } from '@/lib/ficha-format'
import {
  businessDaysBetween, fmtBigMoney, fmtDate, fmtDateTime, fmtMoney, fmtNum, fmtPct, todayISO,
} from '@/lib/format'
import { QUOTABLE_CLASSES } from '@/lib/quotes'
import { requireUser } from '@/lib/supabase/server'
import type { Asset, Position, Proceed, Thesis, Transaction } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const { supabase } = await requireUser()
  const { data } = await supabase.from('assets').select('ticker').eq('id', id).maybeSingle()
  return { title: data?.ticker ?? 'Ativo' }
}

export default async function AtivoPage({ params }: { params: Params }) {
  const { id } = await params
  const { supabase } = await requireUser()
  const today = todayISO()

  const [assetRes, thesesRes, txRes, prRes, posRes] = await Promise.all([
    supabase.from('assets').select('*').eq('id', id).maybeSingle(),
    supabase.from('theses').select(THESIS_FULL_SELECT).eq('asset_id', id).order('version', { ascending: false }),
    supabase.from('transactions').select('*').eq('asset_id', id).order('trade_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('proceeds').select('*').eq('asset_id', id).order('pay_date', { ascending: false }),
    supabase.from('v_positions').select('*').eq('asset_id', id).maybeSingle(),
  ])
  if (!assetRes.data) notFound()
  const asset = assetRes.data as Asset
  const theses = ((thesesRes.data ?? []) as Thesis[]).map(normalizeThesis)
  const current = theses.find((t) => t.status === 'current') ?? null
  const draft = theses.find((t) => t.status === 'draft') ?? null
  const txs = (txRes.data ?? []) as Transaction[]
  const proceeds = (prRes.data ?? []) as Proceed[]
  const pos = posRes.data as Position | null
  const qty = pos ? Number(pos.quantity) : 0

  const staleDays = asset.price_date ? businessDaysBetween(asset.price_date, today) : null
  const broken = (current?.thesis_triggers ?? []).filter((g) => triggerState(g) === 'broken').length
  const m = priceMetrics(asset.current_price, current)
  const buyOk = !!current && isApproval(current.classification) && !!m && m.aboveCeiling === false
  const ficha = current
    ? thesisToFicha({
        version: current.version, core: current,
        indicators: current.thesis_indicators ?? [], triggers: current.thesis_triggers ?? [],
        events: current.thesis_events ?? [], risks: current.thesis_risks ?? [],
      })
    : null

  return (
    <>
      <PageHeader
        back="/ativos"
        title={asset.ticker}
        subtitle={asset.name}
        actions={<Link href={`/ativos/${id}/editar`} aria-label="Editar cadastro" className="rounded-full p-2 text-ink2 active:bg-surface2"><Pencil size={19} /></Link>}
      />
      <Page>
        {/* ---------- cabeçalho: fase, cotação */}
        <div className="card-pad">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="label">Fase</span>
              <PhaseSelect assetId={asset.id} phase={asset.phase} />
            </div>
            {current && broken > 0 && <Badge tone="bad">{broken} gatilho(s) rompido(s)</Badge>}
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-1">
                <div className="num text-3xl font-bold tracking-tight">{fmtMoney(asset.current_price, asset.currency)}</div>
                {QUOTABLE_CLASSES.includes(asset.asset_class) && <QuoteRefreshButton assetId={asset.id} />}
              </div>
              <div className={`num text-xs ${staleDays != null && staleDays > STALE_PRICE_BUSINESS_DAYS ? 'text-warn' : 'text-ink3'}`}>
                {asset.price_date ? `${fmtDate(asset.price_date)}${asset.price_source ? ` · ${asset.price_source}` : ''}` : 'Sem cotação'}
                {staleDays != null && staleDays > STALE_PRICE_BUSINESS_DAYS ? ` · ${staleDays} dias úteis` : ''}
              </div>
            </div>
            {asset.market_cap != null && (
              <div className="text-right">
                <div className="label">Valor de mercado</div>
                <div className="num text-sm font-medium">{fmtBigMoney(asset.market_cap, asset.currency)}</div>
              </div>
            )}
          </div>
          <details className="group mt-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-accent">Informar cotação manualmente</summary>
            <div className="mt-3">
              <PriceUpdateForm assetId={asset.id} today={today} canFetch={false} />
            </div>
          </details>
        </div>

        {/* ---------- análise em andamento / ações de tese */}
        {draft && (
          <Notice tone="info">
            <div className="flex items-center justify-between gap-3">
              <span>Análise v{draft.version} em andamento{draft.updated_at ? ` · salva em ${fmtDateTime(draft.updated_at)}` : ''}</span>
              <Link href={`/teses/${draft.id}/editar`} className="shrink-0 font-semibold text-info">Continuar</Link>
            </div>
          </Notice>
        )}

        {!current ? (
          <Empty action={!draft && <Link href={`/ativos/${id}/tese`} className="btn-primary"><FilePlus2 size={18} />Iniciar análise</Link>}>
            {draft ? 'A primeira tese ainda não foi concluída.' : 'Sem tese vigente. Comece a análise ou importe a ficha.'}
          </Empty>
        ) : (
          <>
            <DecisionCard t={current} />
            <PriceCard t={current} price={asset.current_price} currency={asset.currency} />
            <ValidityCard t={current} today={today} />

            {(current.thesis_triggers ?? []).length > 0 && (
              <Section title="Gatilhos monitorados">
                <Divided>
                  {current.thesis_triggers!.map((g) => <TriggerRow key={g.id} trigger={g} today={today} editable />)}
                </Divided>
              </Section>
            )}

            {(current.thesis_events ?? []).length > 0 && (
              <Section title="Eventos a acompanhar">
                <Divided>
                  {current.thesis_events!.map((e) => <EventItem key={e.id} event={e} today={today} editable />)}
                </Divided>
              </Section>
            )}

            <ThesisBody t={current} currency={asset.currency} />

            <div className="grid grid-cols-2 gap-2">
              {!draft && (
                <Link href={`/ativos/${id}/tese`} className="btn-secondary"><FilePlus2 size={16} />Nova versão</Link>
              )}
              <Link href={`/teses/${current.id}/editar`} className={`btn-secondary ${draft ? 'col-span-2' : ''}`}><Pencil size={16} />Corrigir v{current.version}</Link>
            </div>
            {ficha && (
              <Collapsible title="Ficha em texto (Seção M)">
                <CopyFicha text={ficha} filename={`${asset.ticker}_ficha_v${current.version}.txt`} />
              </Collapsible>
            )}
          </>
        )}

        {/* ---------- posição */}
        <Section title="Posição">
          {qty > 0 || txs.length > 0 ? (
            <div className="card-pad space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Quantidade" value={fmtNum(qty, 6, 0)} />
                <Stat label="Preço médio" value={fmtNum(pos?.avg_cost ?? null)} />
                <Stat
                  label="Resultado"
                  value={pos?.market_value != null && pos.invested ? fmtPct(Number(pos.market_value) / Number(pos.invested) - 1, 1, true) : '—'}
                  tone={pos?.market_value != null && pos.invested && Number(pos.market_value) >= Number(pos.invested) ? 'ok' : 'bad'}
                />
              </div>
              <div className="num grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-ink3">Valor atual</span><span className="text-right font-semibold">{fmtMoney(pos?.market_value ?? null)}</span>
                <span className="text-ink3">Custo da posição</span><span className="text-right">{fmtMoney(pos?.invested ?? null)}</span>
                <span className="text-ink3">Resultado realizado</span><span className="text-right">{fmtMoney(pos?.realized_pnl ?? null)}</span>
                <span className="text-ink3">Proventos recebidos</span><span className="text-right">{fmtMoney(pos?.proceeds_received ?? 0)}</span>
              </div>
            </div>
          ) : (
            <p className="px-1 text-sm text-ink3">Nenhuma operação registrada.</p>
          )}
        </Section>

        <Collapsible
          title={buyOk ? 'Registrar compra ou venda' : 'Registrar operação'}
          meta={!buyOk && current ? 'fora do preço de compra' : undefined}
          defaultOpen={false}
        >
          <TransactionForm
            assetId={asset.id}
            ticker={asset.ticker}
            today={today}
            maxBuy={current?.max_buy_price ?? null}
            approved={isApproval(current?.classification)}
            hasThesis={!!current}
            classificationLabel={classificationLabel(current?.classification)}
            held={qty}
            currentPrice={asset.current_price}
          />
        </Collapsible>

        {qty > 0 && (
          <Collapsible title="Registrar provento">
            <ProceedForm assets={[{ id: asset.id, ticker: asset.ticker }]} today={today} defaultAssetId={asset.id} />
          </Collapsible>
        )}

        {txs.length > 0 && (
          <Section title="Operações">
            <Divided>
              {txs.map((t) => (
                <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={t.type === 'buy' ? 'accent' : 'info'}>{t.type === 'buy' ? 'Compra' : 'Venda'}</Badge>
                      {t.outside_criteria && <Badge tone="warn">Exceção</Badge>}
                      <span className="num text-xs text-ink3">{fmtDate(t.trade_date)}</span>
                    </div>
                    <div className="num mt-1 text-sm">
                      {fmtNum(Number(t.quantity), 6, 0)} × {fmtMoney(Number(t.price))}
                      {Number(t.fees) > 0 ? ` + ${fmtMoney(Number(t.fees))}` : ''}
                    </div>
                    {t.exception_justification && <p className="mt-1 text-xs text-warn">Justificativa: {t.exception_justification}</p>}
                    {t.notes && <p className="mt-0.5 text-xs text-ink3">{t.notes}</p>}
                  </div>
                  <ConfirmButton action={deleteTransaction.bind(null, t.id)} className="btn-ghost px-2 text-ink3" confirmText="Excluir?">
                    <Trash2 size={16} />
                  </ConfirmButton>
                </div>
              ))}
            </Divided>
          </Section>
        )}

        {proceeds.length > 0 && (
          <Section title="Proventos">
            <Divided>
              {proceeds.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="num text-sm font-medium">{fmtMoney(Number(p.amount))} <span className="font-normal text-ink3">· {p.kind === 'jcp' ? 'JCP' : p.kind}</span></div>
                    <div className="num text-xs text-ink3">{fmtDate(p.pay_date)}{p.notes ? ` · ${p.notes}` : ''}</div>
                  </div>
                  <ConfirmButton action={deleteProceed.bind(null, p.id)} className="btn-ghost px-2 text-ink3" confirmText="Excluir?">
                    <Trash2 size={16} />
                  </ConfirmButton>
                </div>
              ))}
            </Divided>
          </Section>
        )}

        {/* ---------- versões */}
        {theses.length > 0 && (
          <Section title="Versões da tese">
            <Divided>
              {theses.map((t) => (
                <Link key={t.id} href={t.status === 'draft' ? `/teses/${t.id}/editar` : `/teses/${t.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-surface2">
                  <span className="num w-8 font-semibold">v{t.version}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{classificationLabel(t.classification)}</div>
                    <div className="num text-xs text-ink3">
                      {fmtDate(t.analysis_date)} · base {fmtMoney(t.fair_value_base)} · teto {fmtMoney(t.max_buy_price)}
                    </div>
                  </div>
                  <Badge tone={t.status === 'current' ? 'ok' : t.status === 'draft' ? 'info' : 'muted'}>
                    {t.status === 'current' ? 'Vigente' : t.status === 'draft' ? 'Rascunho' : 'Anterior'}
                  </Badge>
                </Link>
              ))}
            </Divided>
          </Section>
        )}

        {/* ---------- cadastro */}
        <Collapsible title="Sobre o ativo">
          <div className="space-y-4">
            {asset.description && <p className="prose-pim">{asset.description}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Classe">{assetClassLabel(asset.asset_class)}</Field>
              <Field label="Setor">{asset.sector ?? '—'}</Field>
              <Field label="Mercado">{asset.market ?? '—'}</Field>
              <Field label="Moeda · País">{asset.currency} · {asset.country}</Field>
              <Field label="Categoria" className="col-span-2">{asset.category ?? '—'}</Field>
              {asset.related_tickers && <Field label="Tickers relacionados" className="col-span-2">{asset.related_tickers}</Field>}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {asset.ri_site && <a href={asset.ri_site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-accent">Site de RI <ExternalLink size={13} /></a>}
              {asset.website && <a href={asset.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-accent">Site institucional <ExternalLink size={13} /></a>}
            </div>
            {asset.notes && <Field label="Anotações"><p className="prose-pim">{asset.notes}</p></Field>}
          </div>
        </Collapsible>
      </Page>
    </>
  )
}
