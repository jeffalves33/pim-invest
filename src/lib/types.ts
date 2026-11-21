export type Phase = 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6'
export type Level = 'baixo' | 'medio' | 'alto'
export type Classification = 'aprovado' | 'condicional' | 'observacao' | 'rejeitado' | 'suspenso'
export type ThesisStatus = 'draft' | 'current' | 'superseded'
export type AssetClass = 'acao' | 'fii' | 'etf' | 'bdr' | 'fundo' | 'renda_fixa' | 'cripto' | 'outro'
export type TriggerCondition = 'lt' | 'gt'

export interface Asset {
  id: string
  user_id: string
  ticker: string
  name: string
  related_tickers: string | null
  asset_class: AssetClass
  sector: string | null
  category: string | null
  market: string | null
  currency: string
  country: string
  website: string | null
  ri_site: string | null
  description: string | null
  phase: Phase
  current_price: number | null
  price_date: string | null
  price_source: string | null
  price_updated_at: string | null
  market_cap: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ThesisIndicator {
  id?: string
  name: string
  value: number | null
  period: string | null
  note: string | null
  is_custom: boolean
  sort?: number
}

export interface ThesisTrigger {
  id?: string
  indicator: string
  condition: TriggerCondition
  limit_value: number | null
  current_value: number | null
  value_date: string | null
  sort?: number
}

export interface ThesisEvent {
  id?: string
  event_date: string
  description: string
  done?: boolean
}

export interface ThesisRisk {
  id?: string
  description: string
  category: string | null
  probability: Level | null
  impact: Level | null
  notes: string | null
  sort?: number
}

/** Campos editáveis da tese (espelham a tela "Tese de investimento"). */
export interface ThesisCore {
  analysis_date: string | null
  horizon: string | null
  philosophy: string | null
  next_review: string | null
  price_ref_date: string | null
  last_balance: string | null
  objective: string | null
  data_sources: string | null

  opportunity: string | null
  why_appreciate: string | null
  invalidation: string | null

  price_at_analysis: number | null
  fair_value_pess: number | null
  fair_value_base: number | null
  fair_value_opt: number | null
  safety_margin: number | null
  max_buy_price: number | null
  max_buy_manual: boolean
  methodology: string | null
  assumptions: string | null

  entry_condition: string | null
  max_contributions: number | null
  first_purchase_plan: string | null
  additional_purchase_criteria: string | null
  no_buy_conditions: string | null

  reduce_conditions: string | null
  full_sell_conditions: string | null
  hold_after_target: string | null

  classification: Classification | null
  quality: Level | null
  price_attractiveness: Level | null
  overall_risk: Level | null
  confidence: Level | null
  justification: string | null
  limitations: string | null

  dossier_url: string | null
}

export const THESIS_CORE_KEYS: (keyof ThesisCore)[] = [
  'analysis_date', 'horizon', 'philosophy', 'next_review', 'price_ref_date', 'last_balance',
  'objective', 'data_sources', 'opportunity', 'why_appreciate', 'invalidation',
  'price_at_analysis', 'fair_value_pess', 'fair_value_base', 'fair_value_opt', 'safety_margin',
  'max_buy_price', 'max_buy_manual', 'methodology', 'assumptions', 'entry_condition',
  'max_contributions', 'first_purchase_plan', 'additional_purchase_criteria', 'no_buy_conditions',
  'reduce_conditions', 'full_sell_conditions', 'hold_after_target', 'classification', 'quality',
  'price_attractiveness', 'overall_risk', 'confidence', 'justification', 'limitations', 'dossier_url',
]

export interface Thesis extends ThesisCore {
  id: string
  user_id: string
  asset_id: string
  version: number
  status: ThesisStatus
  concluded_at: string | null
  created_at: string
  updated_at: string
  thesis_indicators?: ThesisIndicator[]
  thesis_triggers?: ThesisTrigger[]
  thesis_events?: ThesisEvent[]
  thesis_risks?: ThesisRisk[]
}

/** Payload enviado pelo editor ao salvar. */
export interface ThesisInput {
  id?: string | null
  asset_id: string
  version?: number | null
  core: ThesisCore
  indicators: ThesisIndicator[]
  triggers: ThesisTrigger[]
  events: ThesisEvent[]
  risks: ThesisRisk[]
}

export interface Transaction {
  id: string
  asset_id: string
  thesis_id: string | null
  type: 'buy' | 'sell'
  trade_date: string
  quantity: number
  price: number
  fees: number
  notes: string | null
  outside_criteria: boolean
  exception_justification: string | null
  created_at: string
}

export interface Proceed {
  id: string
  asset_id: string
  kind: 'dividendo' | 'jcp' | 'rendimento' | 'outro'
  pay_date: string
  amount: number
  notes: string | null
}

export interface Position {
  asset_id: string
  ticker: string
  name: string
  current_price: number | null
  price_date: string | null
  quantity: number
  avg_cost: number | null
  invested: number | null
  market_value: number | null
  realized_pnl: number | null
  proceeds_received: number
  first_trade: string | null
  last_trade: string | null
  trades: number
  trades_outside_criteria: number
}

export interface ActivityEntry {
  id: string
  asset_id: string | null
  thesis_id: string | null
  action: string
  summary: string
  details: Record<string, unknown> | null
  created_at: string
}

export function emptyThesisCore(): ThesisCore {
  return {
    analysis_date: null, horizon: null, philosophy: null, next_review: null, price_ref_date: null,
    last_balance: null, objective: null, data_sources: null, opportunity: null, why_appreciate: null,
    invalidation: null, price_at_analysis: null, fair_value_pess: null, fair_value_base: null,
    fair_value_opt: null, safety_margin: 20, max_buy_price: null, max_buy_manual: false,
    methodology: null, assumptions: null, entry_condition: null, max_contributions: null,
    first_purchase_plan: null, additional_purchase_criteria: null, no_buy_conditions: null,
    reduce_conditions: null, full_sell_conditions: null, hold_after_target: null,
    classification: null, quality: null, price_attractiveness: null, overall_risk: null,
    confidence: null, justification: null, limitations: null, dossier_url: null,
  }
}
