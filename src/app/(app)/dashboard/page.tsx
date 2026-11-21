import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, FileText, LogOut, Plus, XCircle } from 'lucide-react'
import { signOut } from '@/actions/auth'
import { ceilingText } from '@/components/AssetRow'
import QuoteRefreshButton from '@/components/QuoteRefreshButton'
import { Badge, Divided, Empty, Page, PageHeader, Section } from '@/components/ui'
import { assetAlerts, needsReview, priceMetrics, sortAlerts, type Alert } from '@/lib/calc'
import { classificationLabel, classificationTone } from '@/lib/constants'
import { loadBundles, loadPositions } from '@/lib/data'
import { daysBetween, fmtCountdown, fmtDate, fmtMoney, fmtPct } from '@/lib/format'
import { todayISO } from '@/lib/format'
import { requireUser } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Painel' }
export const dynamic = 'force-dynamic'

const ALERT_ICON: Record<Alert['kind'], typeof AlertTriangle> = {
  review_overdue: Clock, review_soon: Clock, trigger_broken: XCircle, event_soon: CalendarDays,
  price_stale: AlertTriangle, price_missing: AlertTriangle, opportunity: CheckCircle2,
  no_thesis: FileText, draft_open: FileText,
}
const toneCls = { bad: 'text-bad', warn: 'text-warn', info: 'text-info', ok: 'text-ok' }

export default async function Dashboard() {
  const { supabase } = await requireUser()
  const today = todayISO()
  const [bundles, positions] = await Promise.all([loadBundles(supabase), loadPositions(supabase)])

  const count = (f: (b: (typeof bundles)[number]) => boolean) => bundles.filter(f).length
  const counters = [
    { label: 'Cadastrados', n: bundles.length, href: '/ativos' },
    { label: 'Em análise', n: count((b) => b.asset.phase === 'f2' || !!b.draft), href: '/ativos?filtro=analise' },
    { label: 'Aguardando', n: count((b) => b.asset.phase === 'f3'), href: '/ativos?fase=f3' },
    { label: 'Aprovados', n: count((b) => b.asset.phase === 'f4'), href: '/ativos?fase=f4' },
    { label: 'Na carteira', n: count((b) => b.asset.phase === 'f5'), href: '/carteira' },
    { label: 'Revisar', n: count((b) => b.asset.phase !== 'f6' && needsReview(b.current, today)), href: '/ativos?filtro=revisao', warn: true },
  ]

  const alerts = sortAlerts(bundles.flatMap((b) => assetAlerts(b, today)))
  const top = alerts.filter((a) => a.kind !== 'draft_open')

  const radar = bundles
    .filter((b) => b.asset.phase !== 'f6' && b.current?.max_buy_price != null && b.asset.current_price != null)
    .map((b) => ({ b, m: priceMetrics(b.asset.current_price, b.current)! }))
    .sort((x, y) => (x.m.overCeiling ?? 0) - (y.m.overCeiling ?? 0))

  const totalValue = positions.reduce((s, p) => s + (p.market_value ?? 0), 0)
  const totalInvested = positions.reduce((s, p) => s + (p.invested ?? 0), 0)
  const open = positions.filter((p) => p.quantity > 0)

  return (
    <>
      <PageHeader
        title="Painel"
        subtitle={new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date())}
        actions={
          <>
            {bundles.length > 0 && <QuoteRefreshButton />}
            <Link href="/ativos/novo" aria-label="Novo ativo" className="rounded-full p-2 text-accent active:bg-surface2"><Plus size={22} /></Link>
            <form action={signOut}>
              <button type="submit" aria-label="Sair" className="rounded-full p-2 text-ink3 active:bg-surface2"><LogOut size={19} /></button>
            </form>
          </>
        }
      />
      <Page>
        <div className="grid grid-cols-3 gap-2">
          {counters.map((c) => (
            <Link key={c.label} href={c.href} className="card px-3 py-3 active:bg-surface2">
              <div className={`num text-2xl font-bold ${c.warn && c.n > 0 ? 'text-warn' : ''}`}>{c.n}</div>
              <div className="text-xs text-ink2">{c.label}</div>
            </Link>
          ))}
        </div>

        {bundles.length === 0 && (
          <Empty action={<Link href="/ativos/novo" className="btn-primary">Cadastrar primeiro ativo</Link>}>
            Nenhum ativo cadastrado ainda.
          </Empty>
        )}

        {top.length > 0 && (
          <Section title="Atenção necessária">
            <Divided>
              {top.slice(0, 12).map((a, i) => {
                const Icon = ALERT_ICON[a.kind]
                const d = a.date ? daysBetween(today, a.date) : null
                return (
                  <Link key={i} href={`/ativos/${a.assetId}`} className="flex items-start gap-3 px-4 py-3 active:bg-surface2">
                    <Icon size={18} className={`mt-0.5 shrink-0 ${toneCls[a.tone]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] leading-snug">
                        <span className="font-semibold">{a.ticker}</span> · {a.title}
                      </div>
                      {(a.date || a.detail) && (
                        <div className="num mt-0.5 text-xs text-ink3">
                          {a.date ? `${fmtDate(a.date)} · ${fmtCountdown(d!)}` : a.detail}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </Divided>
            {top.length > 12 && <p className="mt-2 px-1 text-xs text-ink3">+{top.length - 12} avisos nos ativos</p>}
          </Section>
        )}

        {radar.length > 0 && (
          <Section title="Radar de preço" action={<span className="text-2xs text-ink3">distância até o teto</span>}>
            <Divided>
              {radar.map(({ b, m }) => {
                const c = ceilingText(m.price, b.current!.max_buy_price)!
                const inside = !m.aboveCeiling
                const fill = inside ? 100 : Math.max(4, Math.min(100, (1 - (m.distToCeiling ?? 0) / 0.5) * 100))
                return (
                  <Link key={b.asset.id} href={`/ativos/${b.asset.id}`} className="block px-4 py-3 active:bg-surface2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{b.asset.ticker}</span>
                      {inside && <Badge tone="ok">Oportunidade</Badge>}
                      <Badge tone={classificationTone(b.current!.classification)} className="ml-auto">{classificationLabel(b.current!.classification)}</Badge>
                    </div>
                    <div className="num mt-1 flex justify-between text-sm">
                      <span>{fmtMoney(m.price)} <span className="text-ink3">→ teto {fmtMoney(b.current!.max_buy_price)}</span></span>
                      <span className="text-ink3">base {fmtPct(m.upside, 1, true)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2">
                      <div className={`h-full rounded-full ${inside ? 'bg-ok' : 'bg-warn/70'}`} style={{ width: `${fill}%` }} />
                    </div>
                    <div className={`num mt-1 text-xs ${inside ? 'text-ok' : 'text-ink3'}`}>{c.text}</div>
                  </Link>
                )
              })}
            </Divided>
          </Section>
        )}

        {open.length > 0 && (
          <Section title="Carteira" action={<Link href="/carteira" className="text-xs font-medium text-accent">Ver tudo</Link>}>
            <Link href="/carteira" className="card-pad block active:bg-surface2">
              <div className="label">Valor de mercado</div>
              <div className="num text-2xl font-bold">{fmtMoney(totalValue)}</div>
              {totalInvested > 0 && (
                <div className={`num text-sm ${totalValue >= totalInvested ? 'text-ok' : 'text-bad'}`}>
                  {fmtMoney(totalValue - totalInvested)} ({fmtPct(totalValue / totalInvested - 1, 1, true)}) sobre o custo
                </div>
              )}
              <div className="mt-1 text-xs text-ink3">{open.length} posição(ões)</div>
            </Link>
          </Section>
        )}
      </Page>
    </>
  )
}
