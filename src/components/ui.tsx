import Link from 'next/link'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Tone } from '@/lib/constants'

const TONES: Record<Tone, string> = {
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn',
  bad: 'bg-bad/15 text-bad',
  info: 'bg-info/15 text-info',
  muted: 'bg-surface2 text-ink2',
  accent: 'bg-accent/15 text-accent',
}

export function Badge({ tone = 'muted', children, className = '' }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={`chip ${TONES[tone]} ${className}`}>{children}</span>
}

export const toneText: Record<Tone, string> = {
  ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', info: 'text-info', muted: 'text-ink2', accent: 'text-accent',
}

export function PageHeader({
  title, subtitle, back, actions,
}: { title: React.ReactNode; subtitle?: React.ReactNode; back?: string; actions?: React.ReactNode }) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[56px] max-w-2xl items-center gap-2 px-4 py-2">
        {back && (
          <Link href={back} aria-label="Voltar" className="-ml-2 rounded-full p-2 text-ink2 active:bg-surface2">
            <ChevronLeft size={22} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold leading-tight">{title}</h1>
          {subtitle && <div className="truncate text-xs text-ink3">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  )
}

export function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-2xl space-y-4 px-4 pb-6 pt-4">{children}</main>
}

export function Section({
  title, action, children, className = '',
}: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-2 flex items-end justify-between gap-2 px-1">
          {title && <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink3">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="label mb-0.5">{label}</div>
      <div className="text-[15px] text-ink">{children ?? '—'}</div>
    </div>
  )
}

export function Stat({
  label, value, tone, hint,
}: { label: string; value: React.ReactNode; tone?: Tone; hint?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface2/70 px-3 py-2.5">
      <div className="label">{label}</div>
      <div className={`num mt-0.5 text-lg font-semibold ${tone ? toneText[tone] : ''}`}>{value}</div>
      {hint && <div className="mt-0.5 text-2xs text-ink3">{hint}</div>}
    </div>
  )
}

/** Bloco recolhível sem JavaScript (details/summary). */
export function Collapsible({
  title, children, defaultOpen = false, meta,
}: { title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; meta?: React.ReactNode }) {
  return (
    <details className="group card" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5">
        <span className="flex-1 text-[15px] font-semibold">{title}</span>
        {meta && <span className="text-xs text-ink3">{meta}</span>}
        <ChevronDown size={18} className="text-ink3 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 py-3">{children}</div>
    </details>
  )
}

export function LinkRow({
  href, children, right,
}: { href: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 active:bg-surface2">
      <div className="min-w-0 flex-1">{children}</div>
      {right}
      <ChevronRight size={18} className="shrink-0 text-ink3" />
    </Link>
  )
}

export function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card-pad flex flex-col items-center gap-3 py-8 text-center text-sm text-ink2">
      <div>{children}</div>
      {action}
    </div>
  )
}

export function Divided({ children }: { children: React.ReactNode }) {
  return <div className="card divide-y divide-line overflow-hidden">{children}</div>
}

export function Notice({ tone = 'info', children }: { tone?: Tone; children: React.ReactNode }) {
  const border: Record<Tone, string> = {
    ok: 'border-ok/30 bg-ok/10', warn: 'border-warn/30 bg-warn/10', bad: 'border-bad/30 bg-bad/10',
    info: 'border-info/30 bg-info/10', muted: 'border-line bg-surface2', accent: 'border-accent/30 bg-accent/10',
  }
  return <div className={`rounded-xl border px-3 py-2.5 text-sm ${border[tone]}`}>{children}</div>
}
