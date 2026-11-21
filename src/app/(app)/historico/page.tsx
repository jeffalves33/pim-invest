import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Activity, CircleDollarSign, FilePen, FileCheck2, Flag, Plus, RefreshCw, ShoppingCart, Trash2,
} from 'lucide-react'
import { Divided, Empty, Page, PageHeader, Section } from '@/components/ui'
import { fmtDate } from '@/lib/format'
import { requireUser } from '@/lib/supabase/server'
import type { ActivityEntry } from '@/lib/types'

export const metadata: Metadata = { title: 'Histórico' }
export const dynamic = 'force-dynamic'

const ICONS: Record<string, typeof Activity> = {
  asset_created: Plus, asset_updated: FilePen, asset_deleted: Trash2, phase_changed: Flag,
  thesis_draft_saved: FilePen, thesis_concluded: FileCheck2, thesis_corrected: FilePen, thesis_draft_deleted: Trash2,
  trigger_updated: Activity, event_done: Flag, price_updated: RefreshCw,
  buy: ShoppingCart, sell: ShoppingCart, transaction_deleted: Trash2, proceed_added: CircleDollarSign, proceed_deleted: Trash2,
}

const PAGE = 100

export default async function Historico({ searchParams }: { searchParams: Promise<{ tipo?: string; mais?: string }> }) {
  const { tipo, mais } = await searchParams
  const { supabase } = await requireUser()
  const limit = PAGE * (Number(mais) > 0 ? Number(mais) : 1)

  let query = supabase
    .from('activity_log')
    .select('id, asset_id, thesis_id, action, summary, details, created_at, assets(ticker)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (tipo === 'teses') query = query.in('action', ['thesis_concluded', 'thesis_corrected', 'thesis_draft_deleted'])
  if (tipo === 'operacoes') query = query.in('action', ['buy', 'sell', 'transaction_deleted', 'proceed_added', 'proceed_deleted'])
  if (tipo === 'fases') query = query.in('action', ['phase_changed', 'asset_created', 'asset_deleted'])
  if (tipo === 'cotacoes') query = query.eq('action', 'price_updated')
  if (!tipo) query = query.neq('action', 'price_updated') // "Tudo" mostra decisões, não cotações

  const { data } = await query
  const rows = (data ?? []) as (ActivityEntry & { assets: { ticker: string } | null })[]

  const groups = new Map<string, typeof rows>()
  for (const r of rows) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(r.created_at))
    groups.set(day, [...(groups.get(day) ?? []), r])
  }
  const time = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

  const filters = [
    { k: undefined as string | undefined, label: 'Tudo' }, { k: 'teses', label: 'Teses' }, { k: 'operacoes', label: 'Operações' },
    { k: 'fases', label: 'Fases' }, { k: 'cotacoes', label: 'Cotações' },
  ]

  return (
    <>
      <PageHeader title="Histórico" subtitle="registro de decisões e alterações" />
      <Page>
        <nav className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {filters.map((f) => (
            <Link key={f.label} href={f.k ? `/historico?tipo=${f.k}` : '/historico'}
              className={`chip shrink-0 border ${tipo === f.k ? 'border-accent bg-accent text-white dark:text-black' : 'border-line bg-surface text-ink2'}`}>
              {f.label}
            </Link>
          ))}
        </nav>
        {rows.length === 0 ? <Empty>Nada registrado ainda.</Empty> : (
          [...groups.entries()].map(([day, list]) => (
            <Section key={day} title={fmtDate(day)}>
              <Divided>
                {list.map((r) => {
                  const Icon = ICONS[r.action] ?? Activity
                  const href = r.thesis_id ? `/teses/${r.thesis_id}` : r.asset_id ? `/ativos/${r.asset_id}` : null
                  const body = (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Icon size={17} className="mt-0.5 shrink-0 text-ink3" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] leading-snug">{r.summary}</div>
                        {r.details && typeof r.details === 'object' && 'justification' in r.details && (
                          <div className="mt-0.5 text-xs text-warn">Justificativa: {String(r.details.justification)}</div>
                        )}
                      </div>
                      <span className="num shrink-0 text-xs text-ink3">{time(r.created_at)}</span>
                    </div>
                  )
                  return href ? <Link key={r.id} href={href} className="block active:bg-surface2">{body}</Link> : <div key={r.id}>{body}</div>
                })}
              </Divided>
            </Section>
          ))
        )}
        {rows.length >= limit && (
          <Link href={`/historico?${tipo ? `tipo=${tipo}&` : ''}mais=${(Number(mais) || 1) + 1}`} className="btn-secondary w-full">Carregar mais</Link>
        )}
      </Page>
    </>
  )
}
