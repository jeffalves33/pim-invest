import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import AssetRow from '@/components/AssetRow'
import QuoteRefreshButton from '@/components/QuoteRefreshButton'
import { Divided, Empty, Page, PageHeader } from '@/components/ui'
import { needsReview } from '@/lib/calc'
import { PHASES } from '@/lib/constants'
import { loadBundles } from '@/lib/data'
import { todayISO } from '@/lib/format'
import { requireUser } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Ativos' }
export const dynamic = 'force-dynamic'

type SP = Promise<{ fase?: string; filtro?: string; q?: string }>

export default async function AtivosPage({ searchParams }: { searchParams: SP }) {
  const { fase, filtro, q } = await searchParams
  const { supabase } = await requireUser()
  const today = todayISO()
  const all = await loadBundles(supabase)

  let list = all
  let label = 'Ativos'
  if (fase) {
    list = list.filter((b) => b.asset.phase === fase)
    label = PHASES.find((p) => p.key === fase)?.label ?? label
  } else if (filtro === 'analise') {
    list = list.filter((b) => b.asset.phase === 'f2' || !!b.draft)
    label = 'Em análise'
  } else if (filtro === 'revisao') {
    list = list.filter((b) => b.asset.phase !== 'f6' && needsReview(b.current, today))
    label = 'Revisão próxima ou vencida'
  } else {
    list = list.filter((b) => b.asset.phase !== 'f6')
  }
  if (q) {
    const s = q.toLowerCase()
    list = list.filter((b) => b.asset.ticker.toLowerCase().includes(s) || b.asset.name.toLowerCase().includes(s))
  }

  const chips = [
    { href: '/ativos', label: 'Ativos', active: !fase && !filtro },
    ...PHASES.map((p) => ({ href: `/ativos?fase=${p.key}`, label: p.label, active: fase === p.key })),
    { href: '/ativos?filtro=revisao', label: 'Revisar', active: filtro === 'revisao' },
  ]

  return (
    <>
      <PageHeader
        title={label}
        subtitle={`${list.length} de ${all.length}`}
        actions={<>{all.length > 0 && <QuoteRefreshButton />}<Link href="/ativos/novo" className="btn-primary px-3 py-2"><Plus size={18} />Novo</Link></>}
      />
      <Page>
        <form className="relative">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
          {fase && <input type="hidden" name="fase" value={fase} />}
          {filtro && <input type="hidden" name="filtro" value={filtro} />}
          <input name="q" defaultValue={q} placeholder="Buscar ticker ou nome" className="input pl-9" />
        </form>
        <nav className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {chips.map((c) => (
            <Link key={c.href} href={c.href}
              className={`chip shrink-0 border ${c.active ? 'border-accent bg-accent text-white dark:text-black' : 'border-line bg-surface text-ink2'}`}>
              {c.label}
            </Link>
          ))}
        </nav>
        {list.length === 0 ? (
          <Empty action={all.length === 0 ? <Link href="/ativos/novo" className="btn-primary">Cadastrar ativo</Link> : undefined}>
            {all.length === 0 ? 'Nenhum ativo cadastrado.' : 'Nenhum ativo neste filtro.'}
          </Empty>
        ) : (
          <Divided>{list.map((b) => <AssetRow key={b.asset.id} b={b} />)}</Divided>
        )}
      </Page>
    </>
  )
}
