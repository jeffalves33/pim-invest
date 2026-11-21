import type { Metadata } from 'next'
import Link from 'next/link'
import ProceedForm from '@/components/ProceedForm'
import { Badge, Collapsible, Divided, Empty, Page, PageHeader, Section, Stat } from '@/components/ui'
import { priceMetrics } from '@/lib/calc'
import { classificationLabel, classificationTone } from '@/lib/constants'
import { loadBundles, loadPositions } from '@/lib/data'
import { fmtDate, fmtMoney, fmtNum, fmtPct, todayISO } from '@/lib/format'
import { requireUser } from '@/lib/supabase/server'
import type { Proceed } from '@/lib/types'

export const metadata: Metadata = { title: 'Carteira' }
export const dynamic = 'force-dynamic'

export default async function Carteira() {
  const { supabase } = await requireUser()
  const today = todayISO()
  const [positions, bundles, { data: prData }] = await Promise.all([
    loadPositions(supabase),
    loadBundles(supabase),
    supabase.from('proceeds').select('*').order('pay_date', { ascending: false }).limit(20),
  ])
  const proceeds = (prData ?? []) as Proceed[]
  const open = positions.filter((p) => p.quantity > 0)
  const closed = positions.filter((p) => p.quantity <= 0)

  const value = open.reduce((s, p) => s + (p.market_value ?? 0), 0)
  const cost = open.reduce((s, p) => s + (p.invested ?? 0), 0)
  const realized = positions.reduce((s, p) => s + (p.realized_pnl ?? 0), 0)
  const income = positions.reduce((s, p) => s + p.proceeds_received, 0)
  const exceptions = positions.reduce((s, p) => s + Number(p.trades_outside_criteria ?? 0), 0)
  const tk = (id: string) => positions.find((p) => p.asset_id === id)?.ticker ?? '—'

  return (
    <>
      <PageHeader title="Carteira" subtitle={`${open.length} posição(ões) aberta(s)`} />
      <Page>
        {positions.length === 0 ? (
          <Empty action={<Link href="/ativos" className="btn-secondary">Ver ativos</Link>}>
            Nenhuma operação registrada. Registre compras na página de cada ativo.
          </Empty>
        ) : (
          <>
            <div className="card-pad space-y-3">
              <div>
                <div className="label">Valor de mercado</div>
                <div className="num text-3xl font-bold tracking-tight">{fmtMoney(value)}</div>
                {cost > 0 && (
                  <div className={`num text-sm ${value >= cost ? 'text-ok' : 'text-bad'}`}>
                    {fmtMoney(value - cost)} ({fmtPct(value / cost - 1, 1, true)}) sobre o custo de {fmtMoney(cost)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Realizado" value={fmtMoney(realized)} tone={realized >= 0 ? 'ok' : 'bad'} />
                <Stat label="Proventos" value={fmtMoney(income)} tone="ok" />
                <Stat label="Exceções" value={String(exceptions)} tone={exceptions > 0 ? 'warn' : undefined} hint="compras fora da tese" />
              </div>
            </div>

            {open.length > 0 && (
              <Section title="Posições">
                <Divided>
                  {open.map((p) => {
                    const b = bundles.find((x) => x.asset.id === p.asset_id)
                    const t = b?.current ?? null
                    const m = priceMetrics(p.current_price, t)
                    const pnl = p.market_value != null && p.invested ? p.market_value / p.invested - 1 : null
                    const weight = value > 0 && p.market_value != null ? p.market_value / value : null
                    return (
                      <Link key={p.asset_id} href={`/ativos/${p.asset_id}`} className="block px-4 py-3 active:bg-surface2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.ticker}</span>
                          {t && <Badge tone={classificationTone(t.classification)}>{classificationLabel(t.classification)}</Badge>}
                          <span className="num ml-auto font-semibold">{fmtMoney(p.market_value)}</span>
                        </div>
                        <div className="num mt-1 flex justify-between text-xs text-ink3">
                          <span>{fmtNum(p.quantity, 6, 0)} × PM {fmtNum(p.avg_cost)} · atual {fmtNum(p.current_price)}</span>
                          <span className={pnl == null ? '' : pnl >= 0 ? 'text-ok' : 'text-bad'}>{fmtPct(pnl, 1, true)}</span>
                        </div>
                        <div className="num mt-0.5 flex justify-between text-xs text-ink3">
                          <span>Peso {fmtPct(weight)}</span>
                          {t?.fair_value_base != null && (
                            <span>
                              {m?.upside != null && m.upside <= 0
                                ? 'Acima do valor justo base — ver estratégia de venda'
                                : `Até o base ${fmtPct(m?.upside, 1, true)}`}
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </Divided>
              </Section>
            )}

            <Collapsible title="Registrar provento">
              <ProceedForm assets={open.map((p) => ({ id: p.asset_id, ticker: p.ticker }))} today={today} />
            </Collapsible>

            {proceeds.length > 0 && (
              <Section title="Últimos proventos">
                <Divided>
                  {proceeds.map((r) => (
                    <div key={r.id} className="num flex justify-between px-4 py-2.5 text-sm">
                      <span><b>{tk(r.asset_id)}</b> <span className="text-ink3">· {r.kind === 'jcp' ? 'JCP' : r.kind} · {fmtDate(r.pay_date)}</span></span>
                      <span className="font-medium">{fmtMoney(Number(r.amount))}</span>
                    </div>
                  ))}
                </Divided>
              </Section>
            )}

            {closed.length > 0 && (
              <Section title="Posições encerradas">
                <Divided>
                  {closed.map((p) => (
                    <Link key={p.asset_id} href={`/ativos/${p.asset_id}`} className="num flex justify-between px-4 py-3 text-sm active:bg-surface2">
                      <span className="font-semibold">{p.ticker}</span>
                      <span className={(p.realized_pnl ?? 0) >= 0 ? 'text-ok' : 'text-bad'}>{fmtMoney(p.realized_pnl)}</span>
                    </Link>
                  ))}
                </Divided>
              </Section>
            )}
          </>
        )}
      </Page>
    </>
  )
}
