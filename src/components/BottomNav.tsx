'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, History, LayoutDashboard, List, Wallet } from 'lucide-react'

const ITEMS = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/ativos', label: 'Ativos', icon: List },
  { href: '/analises', label: 'Análises', icon: FileText },
  { href: '/carteira', label: 'Carteira', icon: Wallet },
  { href: '/historico', label: 'Histórico', icon: History },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto grid max-w-2xl grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(`${href}/`) ||
            (href === '/ativos' && path.startsWith('/teses/'))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10.5px] font-medium ${active ? 'text-accent' : 'text-ink3'}`}
            >
              <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
