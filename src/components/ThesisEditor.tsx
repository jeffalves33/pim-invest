'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, FileUp, Plus, Trash2, X } from 'lucide-react'
import { saveThesis } from '@/actions/theses'
import { autoMaxBuy, priceMetrics } from '@/lib/calc'
import {
  CLASSIFICATIONS, LEVELS, PHILOSOPHIES, RISK_CATEGORIES, classificationLabel, levelLabel,
} from '@/lib/constants'
import { parseBRNumber, parseFicha, type ParsedFicha } from '@/lib/ficha-parser'
import { fmtMoney, fmtNum, fmtPct, toInputNumber } from '@/lib/format'
import type {
  Level, ThesisCore, ThesisEvent, ThesisIndicator, ThesisRisk, ThesisTrigger,
} from '@/lib/types'

export interface EditorInitial {
  id: string | null
  version: number | null
  status: 'draft' | 'current' | 'superseded' | 'new'
  core: ThesisCore
  indicators: ThesisIndicator[]
  triggers: ThesisTrigger[]
  events: ThesisEvent[]
  risks: ThesisRisk[]
}

const STANDARD = ['P/L', 'P/VP', 'ROE', 'ROIC', 'EV/EBITDA', 'Dívida líquida/EBITDA', 'Margem líquida', 'CAGR da receita', 'Dividend Yield']
const MAX_CUSTOM = 4

function withStandardIndicators(list: ThesisIndicator[]): ThesisIndicator[] {
  const std = STANDARD.map((name) =>
    list.find((i) => !i.is_custom && i.name.toLowerCase() === name.toLowerCase()) ??
    { name, value: null, period: null, note: null, is_custom: false })
  const extraStd = list.filter((i) => !i.is_custom && !STANDARD.some((n) => n.toLowerCase() === i.name.toLowerCase()))
  return [...std, ...extraStd, ...list.filter((i) => i.is_custom)]
}

// ------------------------------------------------------------------ campos básicos

function NumInput({
  value, onChange, placeholder, className = '', digits = 4,
}: { value: number | null; onChange: (n: number | null) => void; placeholder?: string; className?: string; digits?: number }) {
  const [text, setText] = useState(toInputNumber(value, digits))
  useEffect(() => {
    if (parseBRNumber(text) !== value) setText(toInputNumber(value, digits))
    // sincroniza só quando o valor muda por fora (importação)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <input
      inputMode="decimal"
      className={`input num ${className}`}
      value={text}
      placeholder={placeholder}
      onChange={(e) => { setText(e.target.value); onChange(parseBRNumber(e.target.value)) }}
    />
  )
}

function L({ label, hint, children, className = '', plain = false }: { label: string; hint?: string; children: React.ReactNode; className?: string; plain?: boolean }) {
  const Tag = plain ? 'div' : 'label'
  return (
    <Tag className={`block ${className}`}>
      <span className="label">{label}</span>
      {hint && <span className="ml-1 text-2xs normal-case text-ink3">· {hint}</span>}
      <div className="mt-1">{children}</div>
    </Tag>
  )
}

function Area({ value, onChange, rows = 4, placeholder }: { value: string | null; onChange: (s: string | null) => void; rows?: number; placeholder?: string }) {
  return <textarea className="textarea" rows={rows} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value || null)} />
}

function Text({ value, onChange, placeholder, type = 'text' }: { value: string | null; onChange: (s: string | null) => void; placeholder?: string; type?: string }) {
  return <input type={type} className="input" value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value || null)} />
}

function LevelPicker({ value, onChange, gender }: { value: Level | null; onChange: (l: Level | null) => void; gender: 'f' | 'm' }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface2 p-1">
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(value === l ? null : l)}
          className={`rounded-lg py-2 text-sm font-medium ${value === l ? 'bg-surface text-ink shadow-sm' : 'text-ink3'}`}
        >
          {levelLabel(l, gender)}
        </button>
      ))}
    </div>
  )
}

function Block({ n, title, children, open, meta }: { n: number; title: string; children: React.ReactNode; open?: boolean; meta?: string }) {
  return (
    <details id={`s${n}`} className="group card scroll-mt-28" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">{n}</span>
        <span className="flex-1 text-[15px] font-semibold">{title}</span>
        {meta && <span className="text-xs text-ink3">{meta}</span>}
        <ChevronDown size={18} className="text-ink3 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-line px-4 py-4">{children}</div>
    </details>
  )
}

// ------------------------------------------------------------------ editor

export default function ThesisEditor({
  assetId, ticker, currentPrice, initial, extra,
}: { assetId: string; ticker: string; currentPrice: number | null; initial: EditorInitial; extra?: React.ReactNode }) {
  const router = useRouter()
  const [id, setId] = useState(initial.id)
  const [version, setVersion] = useState(initial.version)
  const [core, setCore] = useState<ThesisCore>(initial.core)
  const [indicators, setIndicators] = useState<ThesisIndicator[]>(withStandardIndicators(initial.indicators))
  const [triggers, setTriggers] = useState<ThesisTrigger[]>(initial.triggers)
  const [events, setEvents] = useState<ThesisEvent[]>(initial.events)
  const [risks, setRisks] = useState<ThesisRisk[]>(initial.risks)
  const [dirty, setDirty] = useState(false)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const [showImport, setShowImport] = useState(initial.status === 'new')
  const [importText, setImportText] = useState('')
  const [preview, setPreview] = useState<ParsedFicha | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isCorrection = initial.status === 'current' || initial.status === 'superseded'

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const set = <K extends keyof ThesisCore>(k: K, v: ThesisCore[K]) => {
    setCore((c) => ({ ...c, [k]: v }))
    setDirty(true)
  }
  const touch = () => setDirty(true)

  const autoMax = autoMaxBuy(core.fair_value_base, core.safety_margin)
  const effectiveMax = core.max_buy_manual ? core.max_buy_price : autoMax
  const metrics = useMemo(
    () => priceMetrics(currentPrice ?? core.price_at_analysis, { ...core, max_buy_price: effectiveMax }),
    [currentPrice, core, effectiveMax],
  )
  const customCount = indicators.filter((i) => i.is_custom).length

  // ---------------- importação
  function runPreview(text: string) {
    setImportText(text)
    setPreview(text.trim() ? parseFicha(text) : null)
  }
  function applyImport() {
    if (!preview) return
    setCore((c) => ({ ...c, ...preview.core }))
    if (preview.indicators.length) setIndicators(withStandardIndicators(preview.indicators))
    if (preview.triggers.length) setTriggers(preview.triggers)
    if (preview.events.length) setEvents(preview.events)
    if (preview.risks.length) setRisks(preview.risks)
    setDirty(true)
    setShowImport(false)
    setPreview(null)
    setImportText('')
    setMsg({ tone: 'ok', text: 'Ficha importada. Revise os blocos e salve.' })
  }

  // ---------------- salvar
  function save(conclude: boolean) {
    setMsg(null)
    start(async () => {
      const r = await saveThesis({
        id, asset_id: assetId, version,
        core: { ...core, max_buy_price: effectiveMax },
        indicators: indicators.filter((i) => i.value != null || i.note || i.period || i.is_custom),
        triggers, events, risks,
      }, conclude)
      if (!r.ok) { setMsg({ tone: 'bad', text: r.error }); return }
      setDirty(false)
      if (conclude || isCorrection) {
        router.push(`/ativos/${assetId}`)
        router.refresh()
        return
      }
      setId(r.id)
      setVersion(r.version)
      setMsg({ tone: 'ok', text: `Rascunho v${r.version} salvo.` })
      if (!id) router.replace(`/teses/${r.id}/editar`)
    })
  }

  const listBtn = 'btn-ghost -ml-3 text-accent'

  return (
    <div className="space-y-3 pb-28">
      {/* ------- navegação entre blocos */}
      <nav className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {['Identificação', 'Tese', 'Indicadores', 'Valuation', 'Compra', 'Venda', 'Riscos', 'Conclusão'].map((s, i) => (
          <a key={s} href={`#s${i + 1}`} className="chip shrink-0 border border-line bg-surface text-ink2"
            onClick={() => { const el = document.getElementById(`s${i + 1}`) as HTMLDetailsElement | null; if (el) el.open = true }}>
            {i + 1}. {s}
          </a>
        ))}
      </nav>

      {/* ------- importar ficha */}
      <div className="card">
        <button type="button" className="flex w-full items-center gap-3 px-4 py-3.5" onClick={() => setShowImport((v) => !v)}>
          <FileUp size={18} className="text-accent" />
          <span className="flex-1 text-left text-[15px] font-semibold">Importar ficha (txt)</span>
          <ChevronDown size={18} className={`text-ink3 transition ${showImport ? 'rotate-180' : ''}`} />
        </button>
        {showImport && (
          <div className="space-y-3 border-t border-line px-4 py-4">
            <p className="text-sm text-ink2">
              Cole a ficha da Seção M (blocos 1 a 8) ou escolha o arquivo. Os campos preenchidos substituem os atuais; listas vazias na ficha mantêm as atuais.
            </p>
            <textarea className="textarea font-mono text-[13px]" rows={8} value={importText} placeholder="1. IDENTIFICAÇÃO&#10;Data da análise: …" onChange={(e) => runPreview(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => fileRef.current?.click()}>Escolher arquivo</button>
              <input ref={fileRef} type="file" accept=".txt,.md,text/plain" className="hidden"
                onChange={async (e) => { const f = e.target.files?.[0]; if (f) runPreview(await f.text()); e.target.value = '' }} />
              <button type="button" className="btn-primary flex-1" disabled={!preview} onClick={applyImport}>Aplicar</button>
            </div>
            {preview && (
              <div className="rounded-xl bg-surface2 p-3 text-sm">
                <div className="font-medium">
                  {Object.keys(preview.core).length} campos · {preview.indicators.length} indicadores · {preview.triggers.length} gatilhos · {preview.events.length} eventos · {preview.risks.length} riscos
                </div>
                {preview.core.classification && <div className="mt-1 text-ink2">Classificação: {classificationLabel(preview.core.classification)}</div>}
                {preview.version != null && version != null && preview.version !== version && (
                  <div className="mt-1 text-warn">A ficha diz versão {preview.version}; esta análise será salva como v{version}.</div>
                )}
                {preview.warnings.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 text-warn">
                    {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------- 1 */}
      <Block n={1} title="Identificação" open meta={version ? `v${version}` : 'nova versão'}>
        <div className="grid grid-cols-2 gap-3">
          <L label="Data da análise"><Text type="date" value={core.analysis_date} onChange={(v) => set('analysis_date', v)} /></L>
          <L label="Próxima revisão"><Text type="date" value={core.next_review} onChange={(v) => set('next_review', v)} /></L>
          <L label="Horizonte"><Text value={core.horizon} onChange={(v) => set('horizon', v)} placeholder="3 a 5 anos" /></L>
          <L label="Filosofia">
            <select className="input" value={core.philosophy ?? ''} onChange={(e) => set('philosophy', e.target.value || null)}>
              <option value="">—</option>
              {PHILOSOPHIES.map((p) => <option key={p} value={p}>{p}</option>)}
              {core.philosophy && !PHILOSOPHIES.includes(core.philosophy) && <option value={core.philosophy}>{core.philosophy}</option>}
            </select>
          </L>
          <L label="Data ref. da cotação"><Text type="date" value={core.price_ref_date} onChange={(v) => set('price_ref_date', v)} /></L>
          <L label="Último balanço usado"><Text value={core.last_balance} onChange={(v) => set('last_balance', v)} placeholder="30/09/2026 (3T26)" /></L>
        </div>
        <L label="Objetivo do investimento"><Area rows={2} value={core.objective} onChange={(v) => set('objective', v)} /></L>
        <L label="Fonte dos dados"><Area rows={3} value={core.data_sources} onChange={(v) => set('data_sources', v)} /></L>
        <L label="Link do dossiê completo"><Text type="url" value={core.dossier_url} onChange={(v) => set('dossier_url', v)} placeholder="https://" /></L>

        <div>
          <div className="label mb-2">Eventos a acompanhar</div>
          <div className="space-y-2">
            {events.map((e, i) => (
              <div key={i} className="flex items-start gap-2">
                <input type="date" className="input w-[150px] shrink-0" value={e.event_date}
                  onChange={(ev) => { setEvents((l) => l.map((x, j) => j === i ? { ...x, event_date: ev.target.value } : x)); touch() }} />
                <input className="input" value={e.description} placeholder="Descrição"
                  onChange={(ev) => { setEvents((l) => l.map((x, j) => j === i ? { ...x, description: ev.target.value } : x)); touch() }} />
                <button type="button" aria-label="Remover" className="p-2.5 text-ink3" onClick={() => { setEvents((l) => l.filter((_, j) => j !== i)); touch() }}><X size={18} /></button>
              </div>
            ))}
          </div>
          <button type="button" className={listBtn} onClick={() => { setEvents((l) => [...l, { event_date: '', description: '' }]); touch() }}>
            <Plus size={16} /> Evento
          </button>
        </div>
      </Block>

      {/* ------- 2 */}
      <Block n={2} title="Tese" open={initial.status === 'new'}>
        <L label="Qual oportunidade estou identificando?"><Area rows={5} value={core.opportunity} onChange={(v) => set('opportunity', v)} /></L>
        <L label="Por que acredito que ele pode se valorizar?"><Area rows={5} value={core.why_appreciate} onChange={(v) => set('why_appreciate', v)} /></L>
        <L label="O que faria minha tese deixar de ser válida?"><Area rows={4} value={core.invalidation} onChange={(v) => set('invalidation', v)} /></L>

        <div>
          <div className="label mb-2">Gatilhos monitorados</div>
          <div className="space-y-3">
            {triggers.map((g, i) => {
              const upd = (patch: Partial<ThesisTrigger>) => { setTriggers((l) => l.map((x, j) => j === i ? { ...x, ...patch } : x)); touch() }
              return (
                <div key={i} className="rounded-xl border border-line p-3">
                  <div className="flex gap-2">
                    <input className="input" value={g.indicator} placeholder="Indicador" onChange={(e) => upd({ indicator: e.target.value })} />
                    <button type="button" aria-label="Remover" className="p-2 text-ink3" onClick={() => { setTriggers((l) => l.filter((_, j) => j !== i)); touch() }}><Trash2 size={17} /></button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <L label="Rompe se">
                      <select className="input" value={g.condition} onChange={(e) => upd({ condition: e.target.value as 'lt' | 'gt' })}>
                        <option value="lt">menor que</option>
                        <option value="gt">maior que</option>
                      </select>
                    </L>
                    <L label="Limite"><NumInput value={g.limit_value} onChange={(n) => upd({ limit_value: n })} /></L>
                    <L label="Valor atual"><NumInput value={g.current_value} onChange={(n) => upd({ current_value: n })} /></L>
                    <L label="Data do valor"><input type="date" className="input" value={g.value_date ?? ''} onChange={(e) => upd({ value_date: e.target.value || null })} /></L>
                  </div>
                </div>
              )
            })}
          </div>
          <button type="button" className={listBtn} onClick={() => { setTriggers((l) => [...l, { indicator: '', condition: 'lt', limit_value: null, current_value: null, value_date: null }]); touch() }}>
            <Plus size={16} /> Gatilho
          </button>
        </div>
      </Block>

      {/* ------- 3 */}
      <Block n={3} title="Indicadores" meta={`${indicators.filter((i) => i.value != null).length} preenchidos`}>
        <p className="text-xs text-ink3">Valor só com número (vírgula decimal). Deixe vazio e explique na observação quando não se aplicar.</p>
        <div className="divide-y divide-line">
          {indicators.map((ind, i) => {
            const upd = (patch: Partial<ThesisIndicator>) => { setIndicators((l) => l.map((x, j) => j === i ? { ...x, ...patch } : x)); touch() }
            return (
              <div key={i} className="space-y-2 py-3 first:pt-0">
                <div className="flex items-center gap-2">
                  {ind.is_custom ? (
                    <input className="input font-medium" value={ind.name} placeholder="Nome do indicador" onChange={(e) => upd({ name: e.target.value })} />
                  ) : (
                    <div className="flex-1 text-[15px] font-semibold">{ind.name}</div>
                  )}
                  {ind.is_custom && (
                    <button type="button" aria-label="Remover" className="p-2 text-ink3" onClick={() => { setIndicators((l) => l.filter((_, j) => j !== i)); touch() }}><Trash2 size={17} /></button>
                  )}
                </div>
                <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
                  <NumInput value={ind.value} placeholder="valor" onChange={(n) => upd({ value: n })} />
                  <input className="input" value={ind.period ?? ''} placeholder="período (LTM, 3T26…)" onChange={(e) => upd({ period: e.target.value || null })} />
                </div>
                <input className="input" value={ind.note ?? ''} placeholder="observação" onChange={(e) => upd({ note: e.target.value || null })} />
              </div>
            )
          })}
        </div>
        <button type="button" className={listBtn} disabled={customCount >= MAX_CUSTOM}
          onClick={() => { setIndicators((l) => [...l, { name: '', value: null, period: null, note: null, is_custom: true }]); touch() }}>
          <Plus size={16} /> Indicador personalizado ({customCount}/{MAX_CUSTOM})
        </button>
      </Block>

      {/* ------- 4 */}
      <Block n={4} title="Valuation" meta={effectiveMax != null ? `teto ${fmtMoney(effectiveMax)}` : undefined}>
        <div className="grid grid-cols-2 gap-3">
          <L label="Cotação na análise"><NumInput value={core.price_at_analysis} onChange={(n) => set('price_at_analysis', n)} digits={2} /></L>
          <L label="Margem de segurança" hint="%"><NumInput value={core.safety_margin} onChange={(n) => set('safety_margin', n)} digits={2} /></L>
          <L label="Valor justo pessimista"><NumInput value={core.fair_value_pess} onChange={(n) => set('fair_value_pess', n)} digits={2} /></L>
          <L label="Valor justo base" hint="alvo"><NumInput value={core.fair_value_base} onChange={(n) => set('fair_value_base', n)} digits={2} /></L>
          <L label="Valor justo otimista"><NumInput value={core.fair_value_opt} onChange={(n) => set('fair_value_opt', n)} digits={2} /></L>
          <L plain label="Preço máximo de compra">
            {core.max_buy_manual ? (
              <NumInput value={core.max_buy_price} onChange={(n) => set('max_buy_price', n)} digits={2} />
            ) : (
              <div className="input num bg-surface2 font-semibold">{autoMax != null ? fmtNum(autoMax) : '—'}</div>
            )}
          </L>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink2">
          <input type="checkbox" checked={core.max_buy_manual}
            onChange={(e) => { set('max_buy_manual', e.target.checked); if (e.target.checked && core.max_buy_price == null) set('max_buy_price', autoMax) }} />
          Definir o preço máximo manualmente (automático: base × (1 − margem))
        </label>

        {metrics && (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface2 p-3 text-center">
            <div><div className="label">Até o base</div><div className="num font-semibold text-ok">{fmtPct(metrics.upside, 1, true)}</div></div>
            <div><div className="label">Pessimista</div><div className="num font-semibold text-bad">{fmtPct(metrics.downside, 1, true)}</div></div>
            <div><div className="label">Ganho/perda</div><div className="num font-semibold">{metrics.ratio == null ? '—' : metrics.ratio === Infinity ? '∞' : `${fmtNum(metrics.ratio, 2)}x`}</div></div>
            <div className="col-span-3 text-2xs text-ink3">
              Calculado na hora sobre {fmtMoney(metrics.price)} — não escreva esses percentuais nos textos.
            </div>
          </div>
        )}

        <L label="Metodologia"><Area rows={3} value={core.methodology} onChange={(v) => set('methodology', v)} /></L>
        <L label="Premissas"><Area rows={7} value={core.assumptions} onChange={(v) => set('assumptions', v)} /></L>
      </Block>

      {/* ------- 5 */}
      <Block n={5} title="Estratégia de compra">
        <L label="Condição ideal de entrada"><Area rows={3} value={core.entry_condition} onChange={(v) => set('entry_condition', v)} /></L>
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <L label="Máx. de aportes"><NumInput value={core.max_contributions} onChange={(n) => set('max_contributions', n == null ? null : Math.trunc(n))} digits={0} /></L>
          <L label="Primeira compra planejada"><Text value={core.first_purchase_plan} onChange={(v) => set('first_purchase_plan', v)} /></L>
        </div>
        <L label="Critérios para compras adicionais"><Area rows={3} value={core.additional_purchase_criteria} onChange={(v) => set('additional_purchase_criteria', v)} /></L>
        <L label="Condições para não comprar, mesmo no preço"><Area rows={3} value={core.no_buy_conditions} onChange={(v) => set('no_buy_conditions', v)} /></L>
      </Block>

      {/* ------- 6 */}
      <Block n={6} title="Estratégia de venda">
        <L label="Condições de redução ou realização parcial"><Area rows={3} value={core.reduce_conditions} onChange={(v) => set('reduce_conditions', v)} /></L>
        <L label="Condições de venda integral"><Area rows={3} value={core.full_sell_conditions} onChange={(v) => set('full_sell_conditions', v)} /></L>
        <L label="Quando manter mesmo após o alvo"><Area rows={3} value={core.hold_after_target} onChange={(v) => set('hold_after_target', v)} /></L>
      </Block>

      {/* ------- 7 */}
      <Block n={7} title="Riscos" meta={`${risks.length}`}>
        <div className="space-y-3">
          {risks.map((r, i) => {
            const upd = (patch: Partial<ThesisRisk>) => { setRisks((l) => l.map((x, j) => j === i ? { ...x, ...patch } : x)); touch() }
            return (
              <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink3">#{i + 1}</span>
                  <input className="input font-medium" value={r.description} placeholder="Descrição do risco" onChange={(e) => upd({ description: e.target.value })} />
                  <button type="button" aria-label="Remover" className="p-2 text-ink3" onClick={() => { setRisks((l) => l.filter((_, j) => j !== i)); touch() }}><Trash2 size={17} /></button>
                </div>
                <input className="input" list="risk-categories" value={r.category ?? ''} placeholder="Categoria" onChange={(e) => upd({ category: e.target.value || null })} />
                <div className="grid grid-cols-2 gap-2">
                  <L plain label="Probabilidade"><LevelPicker gender="f" value={r.probability} onChange={(l) => upd({ probability: l })} /></L>
                  <L plain label="Impacto"><LevelPicker gender="m" value={r.impact} onChange={(l) => upd({ impact: l })} /></L>
                </div>
                <textarea className="textarea" rows={3} value={r.notes ?? ''} placeholder="O que monitorar; se invalida a tese" onChange={(e) => upd({ notes: e.target.value || null })} />
              </div>
            )
          })}
        </div>
        <datalist id="risk-categories">{RISK_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        <button type="button" className={listBtn} onClick={() => { setRisks((l) => [...l, { description: '', category: null, probability: null, impact: null, notes: null }]); touch() }}>
          <Plus size={16} /> Risco
        </button>
      </Block>

      {/* ------- 8 */}
      <Block n={8} title="Conclusão" meta={core.classification ? classificationLabel(core.classification) : undefined}>
        <L label="Classificação">
          <select className="input" value={core.classification ?? ''} onChange={(e) => set('classification', (e.target.value || null) as ThesisCore['classification'])}>
            <option value="">—</option>
            {CLASSIFICATIONS.map((c) => <option key={c.key} value={c.key}>{c.label} ({c.method})</option>)}
          </select>
        </L>
        <L plain label="Qualidade da empresa"><LevelPicker gender="f" value={core.quality} onChange={(l) => set('quality', l)} /></L>
        <L plain label="Atratividade do preço"><LevelPicker gender="f" value={core.price_attractiveness} onChange={(l) => set('price_attractiveness', l)} /></L>
        <L plain label="Risco geral"><LevelPicker gender="m" value={core.overall_risk} onChange={(l) => set('overall_risk', l)} /></L>
        <L plain label="Grau de confiança da análise"><LevelPicker gender="m" value={core.confidence} onChange={(l) => set('confidence', l)} /></L>
        <L label="Justificativa"><Area rows={6} value={core.justification} onChange={(v) => set('justification', v)} /></L>
        <L label="Principais limitações"><Area rows={4} value={core.limitations} onChange={(v) => set('limitations', v)} /></L>
      </Block>

      {extra}

      {/* ------- barra de ações */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {msg && <p className={`mb-2 text-sm ${msg.tone === 'ok' ? 'text-ok' : 'text-bad'}`}>{msg.text}</p>}
          {isCorrection ? (
            <button type="button" className="btn-primary w-full" disabled={pending} onClick={() => save(false)}>
              {pending ? 'Salvando…' : `Salvar correção na v${version}`}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" disabled={pending} onClick={() => save(false)}>
                {pending ? '…' : 'Salvar rascunho'}
              </button>
              <button type="button" className="btn-primary" disabled={pending} onClick={() => save(true)}>
                {pending ? 'Salvando…' : 'Concluir tese'}
              </button>
            </div>
          )}
          <p className="mt-1.5 text-center text-2xs text-ink3">
            {ticker} · {isCorrection ? 'corrige a versão sem criar outra' : 'concluir torna esta versão a vigente e arquiva a anterior'}
            {dirty ? ' · alterações não salvas' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
