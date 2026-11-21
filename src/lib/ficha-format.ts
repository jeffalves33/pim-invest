/**
 * Gera a ficha em texto (mesmo formato aceito pelo leitor) a partir de uma tese.
 * Útil para exportar, copiar para outro lugar ou revisar com o analista.
 */
import { classificationLabel, levelLabel } from './constants'
import { fichaNum, fmtDate } from './format'
import type { ThesisCore, ThesisEvent, ThesisIndicator, ThesisRisk, ThesisTrigger } from './types'

const t = (s: string | null | undefined) => (s && s.trim() ? s.trim() : '—')
const d = (s: string | null | undefined) => (s ? fmtDate(s) : '—')
const money = (n: number | null | undefined) => fichaNum(n, 2)

const STANDARD_INDICATORS = [
  'P/L', 'P/VP', 'ROE', 'ROIC', 'EV/EBITDA', 'Dívida líquida/EBITDA', 'Margem líquida',
  'CAGR da receita', 'Dividend Yield',
]

export function thesisToFicha(input: {
  version: number | null
  core: ThesisCore
  indicators: ThesisIndicator[]
  triggers: ThesisTrigger[]
  events: ThesisEvent[]
  risks: ThesisRisk[]
}): string {
  const { core: c } = input
  const L: string[] = []

  L.push('1. IDENTIFICAÇÃO')
  L.push(`Data da análise: ${d(c.analysis_date)}`)
  L.push(`Versão: ${input.version ?? '—'}`)
  L.push(`Horizonte: ${t(c.horizon)}`)
  L.push(`Filosofia predominante: ${t(c.philosophy)}`)
  L.push(`Próxima revisão: ${d(c.next_review)}`)
  L.push(`Data ref. da cotação: ${d(c.price_ref_date)}`)
  L.push(`Último balanço usado: ${t(c.last_balance)}`)
  L.push(`Objetivo do investimento: ${t(c.objective)}`)
  L.push(`Fonte dos dados: ${t(c.data_sources)}`)
  L.push('Eventos a acompanhar:')
  const evs = [...input.events].sort((a, b) => a.event_date.localeCompare(b.event_date))
  if (evs.length === 0) L.push('- —')
  for (const e of evs) L.push(`- ${fmtDate(e.event_date)} — ${e.description}`)
  L.push('')

  L.push('2. TESE')
  L.push('Qual oportunidade estou identificando?')
  L.push(t(c.opportunity))
  L.push('')
  L.push('Por que acredito que ele pode se valorizar?')
  L.push(t(c.why_appreciate))
  L.push('')
  L.push('O que faria minha tese deixar de ser válida?')
  L.push(t(c.invalidation))
  L.push('')
  L.push('Gatilhos monitorados:')
  if (input.triggers.length === 0) L.push('- —')
  for (const g of input.triggers) {
    L.push(`- ${g.indicator} | ${g.condition === 'gt' ? 'maior que' : 'menor que'} | ${fichaNum(g.limit_value)} | ${fichaNum(g.current_value)} | ${d(g.value_date)}`)
  }
  L.push('')

  L.push('3. INDICADORES')
  const std = input.indicators.filter((i) => !i.is_custom)
  const custom = input.indicators.filter((i) => i.is_custom)
  const line = (i: ThesisIndicator) => `${fichaNum(i.value)} | ${t(i.period)} | ${t(i.note)}`
  const used = new Set<string>()
  for (const name of STANDARD_INDICATORS) {
    const i = std.find((x) => x.name.toLowerCase() === name.toLowerCase())
    if (i) { used.add(i.name); L.push(`${i.name}: ${line(i)}`) } else L.push(`${name}: — | — | —`)
  }
  for (const i of std) if (!used.has(i.name)) L.push(`${i.name}: ${line(i)}`)
  for (const i of custom) L.push(`Indicador personalizado — ${i.name}: ${line(i)}`)
  L.push('')

  L.push('4. VALUATION')
  L.push(`Cotação atual: ${money(c.price_at_analysis)}`)
  L.push(`Valor justo pessimista: ${money(c.fair_value_pess)}`)
  L.push(`Valor justo base: ${money(c.fair_value_base)}`)
  L.push(`Valor justo otimista: ${money(c.fair_value_opt)}`)
  L.push(`Margem de segurança (%): ${fichaNum(c.safety_margin)}`)
  L.push(`Preço máximo de compra: ${money(c.max_buy_price)}`)
  L.push(`Metodologia: ${t(c.methodology)}`)
  L.push(`Premissas: ${t(c.assumptions)}`)
  L.push('')

  L.push('5. ESTRATÉGIA DE COMPRA')
  L.push(`Condição ideal de entrada: ${t(c.entry_condition)}`)
  L.push(`Máx. de aportes: ${c.max_contributions ?? '—'}`)
  L.push(`Primeira compra planejada: ${t(c.first_purchase_plan)}`)
  L.push(`Critérios para compras adicionais: ${t(c.additional_purchase_criteria)}`)
  L.push(`Condições para não comprar, mesmo no preço: ${t(c.no_buy_conditions)}`)
  L.push('')

  L.push('6. ESTRATÉGIA DE VENDA')
  L.push(`Condições de redução ou realização parcial: ${t(c.reduce_conditions)}`)
  L.push(`Condições de venda integral: ${t(c.full_sell_conditions)}`)
  L.push(`Quando manter mesmo após o alvo: ${t(c.hold_after_target)}`)
  L.push('')

  L.push('7. RISCOS')
  input.risks.forEach((r, idx) => {
    L.push(`Risco ${idx + 1}`)
    L.push(`Descrição: ${t(r.description)}`)
    L.push(`Categoria: ${t(r.category)}`)
    L.push(`Probabilidade: ${levelLabel(r.probability, 'f')}`)
    L.push(`Impacto: ${levelLabel(r.impact, 'f')}`)
    L.push(`Observações: ${t(r.notes)}`)
    L.push('')
  })
  if (input.risks.length === 0) L.push('')

  L.push('8. CONCLUSÃO')
  L.push(`Classificação: ${c.classification ? classificationLabel(c.classification) : '—'}`)
  L.push(`Qualidade da empresa: ${levelLabel(c.quality, 'f')}`)
  L.push(`Atratividade do preço: ${levelLabel(c.price_attractiveness, 'f')}`)
  L.push(`Risco geral: ${levelLabel(c.overall_risk, 'm')}`)
  L.push(`Grau de confiança da análise: ${levelLabel(c.confidence, 'm')}`)
  L.push(`Justificativa: ${t(c.justification)}`)
  L.push(`Principais limitações: ${t(c.limitations)}`)
  return L.join('\n') + '\n'
}
