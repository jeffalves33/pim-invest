import type { AssetClass, Classification, Level, Phase } from './types'

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted' | 'accent'

export const PHASES: { key: Phase; label: string; tone: Tone }[] = [
  { key: 'f1', label: 'Descoberta', tone: 'muted' },
  { key: 'f2', label: 'Em análise', tone: 'info' },
  { key: 'f3', label: 'Aguardando oportunidade', tone: 'warn' },
  { key: 'f4', label: 'Aprovado para compra', tone: 'ok' },
  { key: 'f5', label: 'Em carteira', tone: 'accent' },
  { key: 'f6', label: 'Encerrado / Descartado', tone: 'muted' },
]

export const phaseLabel = (p: Phase | string | null | undefined) =>
  PHASES.find((x) => x.key === p)?.label ?? '—'
export const phaseTone = (p: Phase | string | null | undefined): Tone =>
  PHASES.find((x) => x.key === p)?.tone ?? 'muted'

export const CLASSIFICATIONS: { key: Classification; label: string; method: string; tone: Tone }[] = [
  { key: 'aprovado', label: 'Aprovado', method: 'Aprovado', tone: 'ok' },
  { key: 'condicional', label: 'Aprovado com ressalvas', method: 'Condicional', tone: 'ok' },
  { key: 'observacao', label: 'Aguardando oportunidade', method: 'Observação', tone: 'warn' },
  { key: 'rejeitado', label: 'Rejeitado', method: 'Rejeitado', tone: 'bad' },
  { key: 'suspenso', label: 'Suspenso', method: 'Suspenso', tone: 'muted' },
]

export const classificationLabel = (c: Classification | string | null | undefined) =>
  CLASSIFICATIONS.find((x) => x.key === c)?.label ?? 'Sem classificação'
export const classificationTone = (c: Classification | string | null | undefined): Tone =>
  CLASSIFICATIONS.find((x) => x.key === c)?.tone ?? 'muted'

/** Fase sugerida a partir da classificação ao concluir a tese. */
export function phaseFromClassification(c: Classification | null): Phase | null {
  switch (c) {
    case 'aprovado':
    case 'condicional':
      return 'f4'
    case 'observacao':
      return 'f3'
    case 'rejeitado':
    case 'suspenso':
      return 'f6'
    default:
      return null
  }
}

export const isApproval = (c: Classification | null | undefined) =>
  c === 'aprovado' || c === 'condicional'

export const LEVELS: Level[] = ['baixo', 'medio', 'alto']

/** Rótulo com concordância: "Média" (qualidade, probabilidade) ou "Médio" (risco, confiança). */
export function levelLabel(l: Level | null | undefined, gender: 'f' | 'm' = 'f'): string {
  if (!l) return '—'
  const f = { baixo: 'Baixa', medio: 'Média', alto: 'Alta' }
  const m = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' }
  return (gender === 'f' ? f : m)[l]
}

/** Tom visual: para "qualidade/atratividade/confiança" alto é bom; para "risco" alto é ruim. */
export function levelTone(l: Level | null | undefined, higherIsBetter: boolean): Tone {
  if (!l) return 'muted'
  if (l === 'medio') return 'warn'
  const good = (l === 'alto') === higherIsBetter
  return good ? 'ok' : 'bad'
}

export const ASSET_CLASSES: { key: AssetClass; label: string }[] = [
  { key: 'acao', label: 'Ação' },
  { key: 'fii', label: 'FII' },
  { key: 'etf', label: 'ETF' },
  { key: 'bdr', label: 'BDR' },
  { key: 'fundo', label: 'Fundo' },
  { key: 'renda_fixa', label: 'Renda fixa' },
  { key: 'cripto', label: 'Cripto' },
  { key: 'outro', label: 'Outro' },
]
export const assetClassLabel = (k: string | null | undefined) =>
  ASSET_CLASSES.find((x) => x.key === k)?.label ?? '—'

export const PHILOSOPHIES = ['Value', 'Growth', 'Quality', 'Híbrida']

export const RISK_CATEGORIES = [
  'Regulatório', 'Político', 'Operacional', 'Financeiro', 'Macroeconômico', 'Crédito',
  'Dividendos', 'Governança', 'Mercado', 'Jurídico', 'Contábil', 'Outro',
]

/** Dias de antecedência para avisos. */
export const REVIEW_WARNING_DAYS = 15
export const EVENT_WARNING_DAYS = 30
export const STALE_PRICE_BUSINESS_DAYS = 3
