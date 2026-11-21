import {
  EVENT_WARNING_DAYS, REVIEW_WARNING_DAYS, STALE_PRICE_BUSINESS_DAYS, isApproval,
} from './constants'
import { addDaysISO, businessDaysBetween, daysBetween } from './format'
import type { Asset, Thesis, ThesisTrigger } from './types'

export const round2 = (n: number) => Math.round(n * 100) / 100

/** Preço máximo de compra = valor justo base × (1 − margem). */
export function autoMaxBuy(base: number | null | undefined, marginPct: number | null | undefined) {
  if (base == null || marginPct == null) return null
  return round2(base * (1 - marginPct / 100))
}

export interface PriceMetrics {
  price: number
  upside: number | null // até o valor justo base (fração)
  upsideOpt: number | null // até o otimista
  downside: number | null // até o pessimista (negativo = perda)
  ratio: number | null // ganho ÷ |perda|
  aboveCeiling: boolean | null
  distToCeiling: number | null // quanto precisa cair (fração) para chegar ao teto; 0 se já está dentro
  overCeiling: number | null // quanto a cotação está acima do teto (fração)
  impliedMargin: number | null // desconto da cotação sobre o valor justo base
}

/** Métricas que dependem da cotação: calculadas sempre na hora, nunca gravadas em texto. */
export function priceMetrics(
  price: number | null | undefined,
  t: Pick<Thesis, 'fair_value_pess' | 'fair_value_base' | 'fair_value_opt' | 'max_buy_price'> | null | undefined,
): PriceMetrics | null {
  if (price == null || !(price > 0) || !t) return null
  const { fair_value_base: base, fair_value_pess: pess, fair_value_opt: opt, max_buy_price: ceil } = t
  const upside = base != null ? base / price - 1 : null
  const downside = pess != null ? pess / price - 1 : null
  let ratio: number | null = null
  if (upside != null && downside != null) {
    ratio = downside < 0 ? upside / Math.abs(downside) : upside > 0 ? Infinity : null
  }
  const above = ceil != null ? price > ceil : null
  return {
    price,
    upside,
    upsideOpt: opt != null ? opt / price - 1 : null,
    downside,
    ratio,
    aboveCeiling: above,
    distToCeiling: ceil != null ? (above ? 1 - ceil / price : 0) : null,
    overCeiling: ceil != null ? price / ceil - 1 : null,
    impliedMargin: base != null ? 1 - price / base : null,
  }
}

export type TriggerState = 'ok' | 'broken' | 'unknown'

export function triggerState(t: Pick<ThesisTrigger, 'condition' | 'limit_value' | 'current_value'>): TriggerState {
  if (t.current_value == null || t.limit_value == null) return 'unknown'
  if (t.condition === 'lt') return t.current_value < t.limit_value ? 'broken' : 'ok'
  return t.current_value > t.limit_value ? 'broken' : 'ok'
}

/** Folga até o gatilho, em fração do limite (positivo = longe de romper). */
export function triggerSlack(t: Pick<ThesisTrigger, 'condition' | 'limit_value' | 'current_value'>): number | null {
  if (t.current_value == null || t.limit_value == null || t.limit_value === 0) return null
  const diff = t.condition === 'lt' ? t.current_value - t.limit_value : t.limit_value - t.current_value
  return diff / Math.abs(t.limit_value)
}

export type AlertKind =
  | 'review_overdue' | 'review_soon' | 'trigger_broken' | 'event_soon' | 'price_stale'
  | 'price_missing' | 'opportunity' | 'no_thesis' | 'draft_open'

export interface Alert {
  kind: AlertKind
  severity: 1 | 2 | 3 // 3 = mais grave
  tone: 'bad' | 'warn' | 'info' | 'ok'
  assetId: string
  ticker: string
  title: string
  detail?: string
  date?: string
}

export interface AssetBundle {
  asset: Asset
  current: Thesis | null
  draft: Thesis | null
}

export function assetAlerts(b: AssetBundle, today: string): Alert[] {
  const { asset, current: t } = b
  const out: Alert[] = []
  const base = { assetId: asset.id, ticker: asset.ticker }
  const active = asset.phase !== 'f6'

  if (b.draft) {
    out.push({ ...base, kind: 'draft_open', severity: 1, tone: 'info', title: `Análise v${b.draft.version} em andamento` })
  }
  if (!t) {
    if (active && asset.phase !== 'f1') {
      out.push({ ...base, kind: 'no_thesis', severity: 2, tone: 'warn', title: 'Sem tese vigente' })
    }
    return out
  }
  if (!active) return out

  if (t.next_review) {
    const d = daysBetween(today, t.next_review)
    if (d < 0) out.push({ ...base, kind: 'review_overdue', severity: 3, tone: 'bad', title: 'Revisão vencida', detail: `Prevista para ${t.next_review}`, date: t.next_review })
    else if (d <= REVIEW_WARNING_DAYS) out.push({ ...base, kind: 'review_soon', severity: 2, tone: 'warn', title: 'Revisão próxima', date: t.next_review })
  }
  for (const g of t.thesis_triggers ?? []) {
    if (triggerState(g) === 'broken') {
      out.push({ ...base, kind: 'trigger_broken', severity: 3, tone: 'bad', title: `Gatilho rompido: ${g.indicator}`, detail: `${g.condition === 'lt' ? 'abaixo de' : 'acima de'} ${g.limit_value}` })
    }
  }
  const horizon = addDaysISO(today, EVENT_WARNING_DAYS)
  for (const e of t.thesis_events ?? []) {
    if (!e.done && e.event_date >= today && e.event_date <= horizon) {
      out.push({ ...base, kind: 'event_soon', severity: 1, tone: 'info', title: e.description, date: e.event_date })
    }
  }
  if (asset.current_price == null || !asset.price_date) {
    out.push({ ...base, kind: 'price_missing', severity: 2, tone: 'warn', title: 'Sem cotação' })
  } else {
    const bd = businessDaysBetween(asset.price_date, today)
    if (bd > STALE_PRICE_BUSINESS_DAYS) {
      out.push({ ...base, kind: 'price_stale', severity: 1, tone: 'warn', title: `Cotação desatualizada (${bd} dias úteis)`, date: asset.price_date })
    }
    const ceil = t.max_buy_price
    const canBuy = isApproval(t.classification) || t.classification === 'observacao'
    if (ceil != null && asset.current_price <= ceil && canBuy && asset.phase !== 'f5') {
      out.push({ ...base, kind: 'opportunity', severity: 3, tone: 'ok', title: 'Cotação dentro do preço de compra', detail: 'Confira as condições de entrada antes de comprar' })
    }
  }
  return out
}

export function sortAlerts(a: Alert[]) {
  return [...a].sort((x, y) => y.severity - x.severity || (x.date ?? '9').localeCompare(y.date ?? '9'))
}

export function needsReview(t: Thesis | null, today: string) {
  if (!t?.next_review) return false
  return daysBetween(today, t.next_review) <= REVIEW_WARNING_DAYS
}
