/**
 * Leitor da ficha em texto (Seção M — tela "Tese de investimento").
 *
 * Formato esperado: blocos "1. IDENTIFICAÇÃO" … "8. CONCLUSÃO", uma linha
 * "Campo: valor" por campo, perguntas da TESE seguidas do parágrafo de
 * resposta, listas com "- " (eventos e gatilhos), indicadores no formato
 * "Nome: valor | período | observação" e riscos em blocos "Risco n".
 * Números com vírgula decimal; "—" significa vazio; datas em dd/mm/aaaa.
 *
 * Sem dependências: roda no navegador, no servidor e em scripts (tsx).
 */
import type {
  Classification, Level, ThesisCore, ThesisEvent, ThesisIndicator, ThesisRisk, ThesisTrigger,
} from './types'

export interface ParsedFicha {
  core: Partial<ThesisCore>
  version: number | null
  indicators: ThesisIndicator[]
  triggers: ThesisTrigger[]
  events: ThesisEvent[]
  risks: ThesisRisk[]
  warnings: string[]
}

type FieldType = 'text' | 'date' | 'num' | 'int' | 'level' | 'class' | 'version'
interface FieldDef { key: keyof ThesisCore | 'version'; type: FieldType }

// ------------------------------------------------------------------ utilidades

export const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Normaliza um rótulo: sem acentos, sem parênteses explicativos, sem ":" final. */
const normLabel = (s: string) => norm(s.replace(/\(.*?\)/g, ' ')).replace(/[:?]+$/, '').trim()

const isEmptyMark = (s: string) => /^[\s—–\-]*$/.test(s) || /^n[aã]o dispon[ií]vel/i.test(s.trim())

/** "1.234,56" → 1234.56 · "12,60 (automático…)" → 12.6 · "—" → null */
export function parseBRNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (isEmptyMark(s)) return null
  const m = s.match(/-?\d[\d.]*(?:,\d+)?/)
  if (!m) return null
  let tok = m[0].replace(/\.$/, '')
  if (tok.includes(',')) tok = tok.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(tok)) tok = tok.replace(/\./g, '')
  const n = Number(tok)
  return Number.isFinite(n) ? n : null
}

/** "17/11/2026" → "2026-11-17"; aceita também ISO. */
export function parseBRDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  let m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) {
    const [, d, mo, y] = m
    const dd = d.padStart(2, '0')
    const mm = mo.padStart(2, '0')
    const date = new Date(`${y}-${mm}-${dd}T00:00:00Z`)
    if (Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(d)) return null
    return `${y}-${mm}-${dd}`
  }
  m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

export function parseLevel(raw: string | null | undefined): Level | null {
  if (!raw) return null
  const n = norm(raw)
  if (n.startsWith('baix')) return 'baixo'
  if (n.startsWith('med')) return 'medio'
  if (n.startsWith('alt')) return 'alto'
  return null
}

export function parseClassification(raw: string | null | undefined): Classification | null {
  if (!raw) return null
  const n = norm(raw)
  if (n.startsWith('aprovado com ressalva') || n.startsWith('condicional')) return 'condicional'
  if (n.startsWith('aprovado')) return 'aprovado'
  if (n.startsWith('aguardando') || n.startsWith('observa')) return 'observacao'
  if (n.startsWith('rejeit') || n.startsWith('descart')) return 'rejeitado'
  if (n.startsWith('suspens')) return 'suspenso'
  return null
}

// ------------------------------------------------------------------ mapas

const SECTION_NAMES: Record<string, number> = {
  identificacao: 1, tese: 2, indicadores: 3, valuation: 4,
  'estrategia de compra': 5, 'estrategia de venda': 6, riscos: 7, conclusao: 8,
}

const FIELDS: Record<number, Record<string, FieldDef>> = {
  1: {
    'data da analise': { key: 'analysis_date', type: 'date' },
    versao: { key: 'version', type: 'version' },
    horizonte: { key: 'horizon', type: 'text' },
    'filosofia predominante': { key: 'philosophy', type: 'text' },
    filosofia: { key: 'philosophy', type: 'text' },
    'proxima revisao': { key: 'next_review', type: 'date' },
    'data ref. da cotacao': { key: 'price_ref_date', type: 'date' },
    'data de referencia da cotacao': { key: 'price_ref_date', type: 'date' },
    'ultimo balanco usado': { key: 'last_balance', type: 'text' },
    'objetivo do investimento': { key: 'objective', type: 'text' },
    'fonte dos dados': { key: 'data_sources', type: 'text' },
    'link do dossie': { key: 'dossier_url', type: 'text' },
    dossie: { key: 'dossier_url', type: 'text' },
  },
  4: {
    'cotacao atual': { key: 'price_at_analysis', type: 'num' },
    'valor justo pessimista': { key: 'fair_value_pess', type: 'num' },
    'valor justo base': { key: 'fair_value_base', type: 'num' },
    'valor justo otimista': { key: 'fair_value_opt', type: 'num' },
    'margem de seguranca': { key: 'safety_margin', type: 'num' },
    'preco maximo de compra': { key: 'max_buy_price', type: 'num' },
    metodologia: { key: 'methodology', type: 'text' },
    premissas: { key: 'assumptions', type: 'text' },
  },
  5: {
    'condicao ideal de entrada': { key: 'entry_condition', type: 'text' },
    'max. de aportes': { key: 'max_contributions', type: 'int' },
    'maximo de aportes': { key: 'max_contributions', type: 'int' },
    'primeira compra planejada': { key: 'first_purchase_plan', type: 'text' },
    'criterios para compras adicionais': { key: 'additional_purchase_criteria', type: 'text' },
    'condicoes para nao comprar, mesmo no preco': { key: 'no_buy_conditions', type: 'text' },
    'condicoes para nao comprar': { key: 'no_buy_conditions', type: 'text' },
  },
  6: {
    'condicoes de reducao ou realizacao parcial': { key: 'reduce_conditions', type: 'text' },
    'condicoes de venda integral': { key: 'full_sell_conditions', type: 'text' },
    'quando manter mesmo apos o alvo': { key: 'hold_after_target', type: 'text' },
  },
  8: {
    classificacao: { key: 'classification', type: 'class' },
    'qualidade da empresa': { key: 'quality', type: 'level' },
    'atratividade do preco': { key: 'price_attractiveness', type: 'level' },
    'atratividade do preco atual': { key: 'price_attractiveness', type: 'level' },
    'risco geral': { key: 'overall_risk', type: 'level' },
    'grau de confianca da analise': { key: 'confidence', type: 'level' },
    'grau de confianca': { key: 'confidence', type: 'level' },
    justificativa: { key: 'justification', type: 'text' },
    'principais limitacoes': { key: 'limitations', type: 'text' },
  },
}

/** Campos de versões antigas da ficha que não existem mais na tela. */
const RETIRED: Record<string, string> = {
  'preco-alvo': 'Preço-alvo (o alvo é o valor justo base)',
  'preco alvo': 'Preço-alvo (o alvo é o valor justo base)',
  'horizonte para atingir o alvo': 'Horizonte para atingir o alvo',
  'preco maximo aceitavel': 'Preço máximo aceitável (use o preço máximo de compra)',
  'condicoes de realizacao parcial': 'Condições de realização parcial (fundido em redução ou realização parcial)',
  'condicoes de reducao de posicao': 'Condições de redução de posição (fundido em redução ou realização parcial)',
  'eventos que invalidam a tese': 'Eventos que invalidam a tese (use o bloco 2)',
  'preco-alvo:': 'Preço-alvo',
}

const QUESTIONS: { match: string[]; key: keyof ThesisCore | null; label: string }[] = [
  { match: ['qual oportunidade estou identificando'], key: 'opportunity', label: 'Oportunidade' },
  {
    match: ['por que acredito que ele pode se valorizar', 'por que acredito que pode se valorizar', 'por que acredito que o ativo pode se valorizar'],
    key: 'why_appreciate', label: 'Por que pode se valorizar',
  },
  {
    match: ['o que faria minha tese deixar de ser valida', 'o que invalidaria a tese'],
    key: 'invalidation', label: 'Invalidação',
  },
  { match: ['por que esse ativo chamou minha atencao'], key: null, label: 'Por que esse ativo chamou minha atenção? (campo removido)' },
  { match: ['quais sao os principais riscos'], key: null, label: 'Quais são os principais riscos? (use o bloco 7)' },
]

const RISK_FIELDS: Record<string, keyof ThesisRisk> = {
  descricao: 'description',
  categoria: 'category',
  probabilidade: 'probability',
  impacto: 'impact',
  gravidade: 'impact',
  observacoes: 'notes',
  observacao: 'notes',
  monitoramento: 'notes',
}

// ------------------------------------------------------------------ parser

export function parseFicha(text: string): ParsedFicha {
  const out: ParsedFicha = {
    core: {}, version: null, indicators: [], triggers: [], events: [], risks: [], warnings: [],
  }
  const lines = text.replace(/\r\n?/g, '\n').split('\n')

  let section = 0
  let mode: 'none' | 'events' | 'triggers' = 'none'
  // destino de linhas de continuação
  let cont: { kind: 'core'; key: keyof ThesisCore } | { kind: 'risk'; key: keyof ThesisRisk } | { kind: 'skip' } | null = null
  let currentRisk: ThesisRisk | null = null
  let sawSection = false

  const appendCore = (key: keyof ThesisCore, piece: string, sep = '\n') => {
    const prev = out.core[key] as string | null | undefined
    ;(out.core as Record<string, unknown>)[key] = prev ? `${prev}${sep}${piece}` : piece
  }

  const setField = (def: FieldDef, raw: string, label: string) => {
    const v = raw.trim()
    switch (def.type) {
      case 'version': {
        const n = parseBRNumber(v)
        out.version = n == null ? null : Math.trunc(n)
        cont = null
        return
      }
      case 'date': {
        const d = parseBRDate(v)
        if (v && !isEmptyMark(v) && !d) out.warnings.push(`Data inválida em "${label}": ${v}`)
        ;(out.core as Record<string, unknown>)[def.key] = d
        cont = null
        return
      }
      case 'num': {
        const n = parseBRNumber(v)
        if (v && !isEmptyMark(v) && n == null) out.warnings.push(`Número inválido em "${label}": ${v}`)
        ;(out.core as Record<string, unknown>)[def.key] = n
        cont = null
        return
      }
      case 'int': {
        const n = parseBRNumber(v)
        ;(out.core as Record<string, unknown>)[def.key] = n == null ? null : Math.trunc(n)
        cont = null
        return
      }
      case 'level': {
        const l = parseLevel(v)
        if (v && !isEmptyMark(v) && !l) out.warnings.push(`Valor não reconhecido em "${label}": ${v}`)
        ;(out.core as Record<string, unknown>)[def.key] = l
        cont = null
        return
      }
      case 'class': {
        const c = parseClassification(v)
        if (v && !isEmptyMark(v) && !c) out.warnings.push(`Classificação não reconhecida: ${v}`)
        ;(out.core as Record<string, unknown>)[def.key] = c
        cont = null
        return
      }
      default: {
        const key = def.key as keyof ThesisCore
        ;(out.core as Record<string, unknown>)[key] = isEmptyMark(v) ? null : v
        cont = { kind: 'core', key }
      }
    }
  }

  const finishRisk = () => {
    if (currentRisk && currentRisk.description) out.risks.push({ ...currentRisk, sort: out.risks.length })
    else if (currentRisk) out.warnings.push('Risco sem descrição foi ignorado')
    currentRisk = null
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    if (line.startsWith('```')) continue

    // ----- cabeçalho de seção
    const h = line.match(/^(\d)\s*[.)\-–—]\s*(.+?)\s*:?$/)
    if (h) {
      const name = norm(h[2])
      const num = SECTION_NAMES[name]
      if (num && Number(h[1]) === num) {
        if (section === 7) finishRisk()
        section = num
        sawSection = true
        mode = 'none'
        cont = null
        continue
      }
    }
    if (!sawSection) continue

    // ----- linha em branco: separa parágrafos dentro de textos longos
    if (!line) {
      if (cont && cont.kind === 'core') {
        const prev = out.core[cont.key]
        if (typeof prev === 'string' && prev && !prev.endsWith('\n\n')) {
          ;(out.core as Record<string, unknown>)[cont.key] = prev + '\n\n'
        }
      }
      continue
    }
    // instruções do modelo entre parênteses, ex.: "(até quatro indicadores…)"
    if (/^\(.*\)$/.test(line)) continue

    // ----- listas
    if (line.startsWith('- ') || line === '-') {
      const item = line.replace(/^-\s*/, '')
      if (mode === 'events') {
        const m = item.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s*[—–\-:]+\s*(.+)$/)
        const date = m ? parseBRDate(m[1]) : null
        if (m && date) out.events.push({ event_date: date, description: m[2].trim() })
        else if (item && !isEmptyMark(item)) out.warnings.push(`Evento sem data válida ignorado: ${item}`)
        continue
      }
      if (mode === 'triggers') {
        const parts = item.split('|').map((p) => p.trim())
        if (parts.length < 3) {
          if (item && !isEmptyMark(item)) out.warnings.push(`Gatilho incompleto ignorado: ${item}`)
          continue
        }
        const c = norm(parts[1])
        const condition = c.startsWith('maior') || c.startsWith('>') || c.startsWith('acima') ? 'gt'
          : c.startsWith('menor') || c.startsWith('<') || c.startsWith('abaixo') ? 'lt' : null
        const limit = parseBRNumber(parts[2])
        if (!condition || limit == null) {
          out.warnings.push(`Gatilho com condição ou limite inválido: ${item}`)
          continue
        }
        out.triggers.push({
          indicator: parts[0],
          condition,
          limit_value: limit,
          current_value: parseBRNumber(parts[3] ?? ''),
          value_date: parseBRDate(parts[4] ?? ''),
          sort: out.triggers.length,
        })
        continue
      }
      // lista dentro de um texto: anexa como linha
      if (cont && cont.kind === 'core') { appendCore(cont.key, line); continue }
      if (cont && cont.kind === 'risk' && currentRisk) {
        const k = cont.key
        ;(currentRisk as unknown as Record<string, unknown>)[k] = `${(currentRisk as unknown as Record<string, string>)[k] ?? ''}\n${line}`.trim()
        continue
      }
      continue
    }

    // ----- seção 2: perguntas e gatilhos
    if (section === 2) {
      const nl = norm(line)
      if (nl.startsWith('gatilhos monitorados')) { mode = 'triggers'; cont = null; continue }
      const q = QUESTIONS.find((qq) => qq.match.some((m) => nl.startsWith(m)))
      if (q) {
        mode = 'none'
        const qIdx = line.indexOf('?')
        const rest = qIdx >= 0 ? line.slice(qIdx + 1).trim() : ''
        if (q.key) {
          ;(out.core as Record<string, unknown>)[q.key] = rest || null
          cont = { kind: 'core', key: q.key }
        } else {
          out.warnings.push(`Pergunta de formato antigo ignorada: ${q.label}`)
          cont = { kind: 'skip' }
        }
        continue
      }
      if (cont?.kind === 'core') { appendCore(cont.key, line, needsSpace(out.core[cont.key]) ? '\n' : ''); continue }
      continue
    }

    // ----- seção 3: indicadores
    if (section === 3) {
      const m = line.match(/^([^:|]+?):\s*(.*)$/)
      if (!m) continue
      let name = m[1].trim()
      let isCustom = false
      const cm = name.match(/^indicador personalizado\s*[—–\-:]\s*(.+)$/i)
      if (cm) { name = cm[1].trim().replace(/^\[|\]$/g, ''); isCustom = true }
      const rest = m[2].trim()
      let value: number | null
      let period: string | null = null
      let note: string | null = null
      if (rest.includes('|')) {
        const parts = rest.split('|').map((p) => p.trim())
        value = parseBRNumber(parts[0])
        period = parts[1] && !isEmptyMark(parts[1]) ? parts[1] : null
        note = parts.slice(2).join(' | ').trim() || null
        if (value == null && parts[0] && !isEmptyMark(parts[0])) note = [parts[0], note].filter(Boolean).join(' — ')
      } else {
        // formato antigo: "6,8 (sobre lucro recorrente…)"
        value = parseBRNumber(rest)
        const leftover = rest.replace(/^-?[\d.,]+\s*%?\s*(a\.a\.)?/, '').trim()
        note = leftover && !isEmptyMark(leftover) ? leftover.replace(/^\((.*)\)$/, '$1') : null
      }
      if (value == null && !period && !note) { cont = null; continue } // linha vazia do modelo
      out.indicators.push({ name, value, period, note, is_custom: isCustom, sort: out.indicators.length })
      cont = null
      continue
    }

    // ----- seção 7: riscos
    if (section === 7) {
      const rm = line.match(/^risco\s*\d+\s*[:—–\-]?\s*(.*)$/i)
      if (rm && !/^risco geral/i.test(line)) {
        finishRisk()
        currentRisk = { description: rm[1]?.trim() || '', category: null, probability: null, impact: null, notes: null }
        cont = null
        continue
      }
      const fm = line.match(/^([^:]{1,40}):\s*(.*)$/)
      if (fm && currentRisk) {
        const key = RISK_FIELDS[normLabel(fm[1])]
        if (key) {
          const v = fm[2].trim()
          if (key === 'probability' || key === 'impact') {
            currentRisk[key] = parseLevel(v)
            cont = null
          } else {
            const prev = (currentRisk as unknown as Record<string, string | null>)[key]
            ;(currentRisk as unknown as Record<string, unknown>)[key] = key === 'notes' && prev ? `${prev} ${v}` : v || null
            cont = { kind: 'risk', key }
          }
          continue
        }
      }
      if (cont?.kind === 'risk' && currentRisk) {
        const k = cont.key
        const prev = (currentRisk as unknown as Record<string, string | null>)[k]
        ;(currentRisk as unknown as Record<string, unknown>)[k] = prev ? `${prev}\n${line}` : line
      }
      continue
    }

    // ----- seções de campos (1, 4, 5, 6, 8)
    const fm = line.match(/^([^:]{1,70}):\s*(.*)$/)
    if (fm) {
      const label = normLabel(fm[1])
      if (section === 1 && label.startsWith('eventos a acompanhar')) { mode = 'events'; cont = null; continue }
      const def = FIELDS[section]?.[label]
      if (def) { mode = 'none'; setField(def, fm[2], fm[1].trim()); continue }
      const retired = RETIRED[label]
      if (retired) {
        out.warnings.push(`Campo de formato antigo ignorado: ${retired}`)
        cont = { kind: 'skip' }
        continue
      }
    }
    if (cont?.kind === 'core') { appendCore(cont.key, line); continue }
    if (cont?.kind === 'skip') continue
    if (mode === 'none') out.warnings.push(`Linha não reconhecida no bloco ${section}: ${line.slice(0, 80)}`)
  }
  if (section === 7) finishRisk()

  // limpeza final dos textos
  for (const k of Object.keys(out.core) as (keyof ThesisCore)[]) {
    const v = out.core[k]
    if (typeof v === 'string') (out.core as Record<string, unknown>)[k] = v.replace(/\n{3,}/g, '\n\n').trim() || null
  }
  for (const r of out.risks) {
    r.description = r.description.trim()
    if (r.notes) r.notes = r.notes.trim()
  }

  if (!sawSection) out.warnings.push('Nenhum bloco reconhecido. A ficha deve começar com "1. IDENTIFICAÇÃO".')

  // preço máximo informado diferente do automático → marcar como manual
  const { fair_value_base: base, safety_margin: ms, max_buy_price: mb } = out.core
  if (base != null && ms != null && mb != null) {
    const auto = Math.round(base * (1 - ms / 100) * 100) / 100
    out.core.max_buy_manual = Math.abs(auto - mb) > 0.005
  }
  return out
}

function needsSpace(prev: unknown) {
  return typeof prev === 'string' && prev.length > 0 && !prev.endsWith('\n\n')
}
