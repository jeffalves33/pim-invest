import { fmtNum } from '@/lib/format'

/**
 * Régua horizontal: pessimista · teto de compra · base · otimista, com a cotação marcada.
 * Faixa verde = até o teto (zona de compra); âmbar = teto até base; neutra = acima do base.
 */
export default function PriceRuler({
  price, pess, ceiling, base, opt,
}: { price: number | null; pess: number | null; ceiling: number | null; base: number | null; opt: number | null }) {
  const pts = [pess, ceiling, base, opt, price].filter((x): x is number => x != null && Number.isFinite(x))
  if (pts.length < 2) return null
  const lo = Math.min(...pts) * 0.94
  const hi = Math.max(...pts) * 1.04
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`
  const w = (a: number, b: number) => `${((b - a) / (hi - lo)) * 100}%`

  const marks = [
    { v: pess, label: 'Pess.', cls: 'text-bad' },
    { v: ceiling, label: 'Teto', cls: 'text-ok' },
    { v: base, label: 'Base', cls: 'text-ink' },
    { v: opt, label: 'Otim.', cls: 'text-info' },
  ].filter((m): m is { v: number; label: string; cls: string } => m.v != null)

  // evita rótulos sobrepostos: alterna em duas linhas quando muito próximos
  const sorted = [...marks].sort((a, b) => a.v - b.v)
  const rows = new Map<string, number>()
  let lastPct = -100
  let lastRow = 1
  for (const m of sorted) {
    const p = ((m.v - lo) / (hi - lo)) * 100
    const row = p - lastPct < 16 ? 1 - lastRow : 0
    rows.set(m.label, row)
    lastPct = p
    lastRow = row
  }

  return (
    <div className="select-none pt-7">
      <div className="relative h-2.5 rounded-full bg-surface2">
        {ceiling != null && <div className="absolute inset-y-0 left-0 rounded-l-full bg-ok/35" style={{ width: pos(ceiling) }} />}
        {ceiling != null && base != null && base > ceiling && (
          <div className="absolute inset-y-0 bg-warn/25" style={{ left: pos(ceiling), width: w(ceiling, base) }} />
        )}
        {marks.map((m) => (
          <div key={m.label} className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-ink3/70" style={{ left: pos(m.v) }} />
        ))}
        {price != null && (
          <div className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(price) }}>
            <div className="h-5 w-5 rounded-full border-[3px] border-surface bg-accent shadow" />
            <div className="num absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white dark:text-black">
              {fmtNum(price)}
            </div>
          </div>
        )}
      </div>
      <div className="relative mt-1.5 h-[64px]">
        {marks.map((m) => (
          <div
            key={m.label}
            className="absolute -translate-x-1/2 text-center leading-tight"
            style={{ left: pos(m.v), top: (rows.get(m.label) ?? 0) * 31 }}
          >
            <div className={`text-2xs font-medium ${m.cls}`}>{m.label}</div>
            <div className="num text-[11px] text-ink2">{fmtNum(m.v)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
