const TZ = 'America/Sao_Paulo'

const nf = (min: number, max: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max })

export function fmtNum(n: number | null | undefined, digits = 2, minDigits = digits): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return nf(minDigits, digits).format(n)
}

export function fmtMoney(n: number | null | undefined, currency = 'BRL'): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(n)
}

/** R$ 84,7 bi · R$ 950 mi */
export function fmtBigMoney(n: number | null | undefined, currency = 'BRL'): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sym = currency === 'BRL' ? 'R$' : currency
  const abs = Math.abs(n)
  if (abs >= 1e12) return `${sym} ${fmtNum(n / 1e12, 2, 1)} tri`
  if (abs >= 1e9) return `${sym} ${fmtNum(n / 1e9, 1, 1)} bi`
  if (abs >= 1e6) return `${sym} ${fmtNum(n / 1e6, 0, 0)} mi`
  return fmtMoney(n, currency)
}

/** Recebe fração (0,123 → "12,3%"). */
export function fmtPct(frac: number | null | undefined, digits = 1, signed = false): string {
  if (frac == null || !Number.isFinite(frac)) return '—'
  const s = nf(digits, digits).format(frac * 100)
  return `${signed && frac > 0 ? '+' : ''}${s}%`
}

/** "2026-11-17" → "17/11/2026" (sem deslocamento de fuso). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d)
}

/** Data de hoje em São Paulo, "YYYY-MM-DD". */
export function todayISO(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  return parts // en-CA já usa YYYY-MM-DD
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Dias corridos de a até b (b − a). */
export function daysBetween(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`)
  const db = Date.parse(`${b}T00:00:00Z`)
  return Math.round((db - da) / 86_400_000)
}

/** Dias úteis (seg–sex) decorridos depois de a até b. */
export function businessDaysBetween(a: string, b: string): number {
  if (a >= b) return 0
  let count = 0
  const d = new Date(`${a}T00:00:00Z`)
  const end = Date.parse(`${b}T00:00:00Z`)
  while (true) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (d.getTime() > end) break
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) count++
  }
  return count
}

export function fmtCountdown(days: number): string {
  if (days === 0) return 'hoje'
  if (days === 1) return 'amanhã'
  if (days === -1) return 'ontem'
  if (days > 0) return `em ${days} dias`
  return `há ${-days} dias`
}

/** Número para campos de input (vírgula decimal, sem milhar). */
export function toInputNumber(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return ''
  const fixed = Number(n.toFixed(digits))
  return String(fixed).replace('.', ',')
}

/** Número em formato da ficha: vírgula decimal, mantendo casas relevantes. */
export function fichaNum(n: number | null | undefined, minDigits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: minDigits, maximumFractionDigits: 4, useGrouping: false,
  }).format(n)
}
