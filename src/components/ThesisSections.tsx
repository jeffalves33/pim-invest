import { ExternalLink } from 'lucide-react'
import { priceMetrics } from '@/lib/calc'
import {
  classificationLabel, classificationTone, levelLabel, levelTone,
} from '@/lib/constants'
import { daysBetween, fmtCountdown, fmtDate, fmtMoney, fmtNum, fmtPct } from '@/lib/format'
import type { Thesis } from '@/lib/types'
import { ceilingText } from './AssetRow'
import PriceRuler from './PriceRuler'
import { Badge, Collapsible, Field, Stat } from './ui'

export function DecisionCard({ t }: { t: Thesis }) {
  const seals = [
    { label: 'Qualidade', v: levelLabel(t.quality, 'f'), tone: levelTone(t.quality, true) },
    { label: 'Atratividade', v: levelLabel(t.price_attractiveness, 'f'), tone: levelTone(t.price_attractiveness, true) },
    { label: 'Risco', v: levelLabel(t.overall_risk, 'm'), tone: levelTone(t.overall_risk, false) },
    { label: 'Confiança', v: levelLabel(t.confidence, 'm'), tone: levelTone(t.confidence, true) },
  ]
  return (
    <div className="card-pad space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="label">Decisão</div>
        <Badge tone={classificationTone(t.classification)} className="text-sm">{classificationLabel(t.classification)}</Badge>
      </div>
      {t.entry_condition && (
        <div>
          <div className="label mb-0.5">Próxima ação — condição de entrada</div>
          <p className="prose-pim">{t.entry_condition}</p>
        </div>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        {seals.map((s) => (
          <div key={s.label} className="rounded-xl bg-surface2/70 px-2 py-2 text-center">
            <div className="text-2xs text-ink3">{s.label}</div>
            <div className={`text-sm font-semibold ${s.tone === 'ok' ? 'text-ok' : s.tone === 'bad' ? 'text-bad' : s.tone === 'warn' ? 'text-warn' : 'text-ink2'}`}>{s.v}</div>
          </div>
        ))}
      </div>
      {(t.justification || t.limitations) && (
        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-medium text-accent">
            <span className="group-open:hidden">Ver justificativa e limitações</span>
            <span className="hidden group-open:inline">Ocultar justificativa</span>
          </summary>
          <div className="mt-2 space-y-3">
            {t.justification && <Field label="Justificativa"><p className="prose-pim">{t.justification}</p></Field>}
            {t.limitations && <Field label="Principais limitações"><p className="prose-pim text-ink2">{t.limitations}</p></Field>}
          </div>
        </details>
      )}
    </div>
  )
}

export function PriceCard({ t, price, currency = 'BRL', label = 'Cotação atual' }: { t: Thesis; price: number | null; currency?: string; label?: string }) {
  const m = priceMetrics(price, t)
  const ceil = ceilingText(price, t.max_buy_price)
  return (
    <div className="card-pad space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="label">Preço × valor justo</div>
        <div className="num text-xs text-ink3">{label} {fmtMoney(price, currency)}</div>
      </div>
      <PriceRuler price={price} pess={t.fair_value_pess} ceiling={t.max_buy_price} base={t.fair_value_base} opt={t.fair_value_opt} />
      {m && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Potencial" value={fmtPct(m.upside, 1, true)} tone={m.upside != null && m.upside > 0 ? 'ok' : 'bad'} hint="até o base" />
          <Stat label="Perda" value={fmtPct(m.downside, 1, true)} tone="bad" hint="no pessimista" />
          <Stat
            label="Ganho/perda"
            value={m.ratio == null ? '—' : m.ratio === Infinity ? '∞' : `${fmtNum(m.ratio, 2)}x`}
            tone={m.ratio != null && m.ratio >= 2 ? 'ok' : m.ratio != null && m.ratio < 1 ? 'bad' : 'warn'}
            hint="potencial ÷ perda"
          />
        </div>
      )}
      {ceil && (
        <div className={`num rounded-xl px-3 py-2 text-sm font-medium ${ceil.tone === 'ok' ? 'bg-ok/15 text-ok' : 'bg-warn/10 text-warn'}`}>
          {ceil.text}
        </div>
      )}
      <div className="num grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-ink3">Preço máximo de compra</span><span className="text-right font-semibold">{fmtMoney(t.max_buy_price, currency)}</span>
        <span className="text-ink3">Margem de segurança</span><span className="text-right">{t.safety_margin != null ? `${fmtNum(t.safety_margin, 2, 0)}%` : '—'}{t.max_buy_manual ? ' · manual' : ''}</span>
        <span className="text-ink3">Valor justo base (alvo)</span><span className="text-right">{fmtMoney(t.fair_value_base, currency)}</span>
      </div>
    </div>
  )
}

export function ValidityCard({ t, today }: { t: Thesis; today: string }) {
  const d = t.next_review ? daysBetween(today, t.next_review) : null
  const tone = d == null ? 'text-ink3' : d < 0 ? 'text-bad' : d <= 15 ? 'text-warn' : 'text-ok'
  const age = t.analysis_date ? daysBetween(t.analysis_date, today) : null
  return (
    <div className="card-pad">
      <div className="label mb-2">Validade da análise</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Próxima revisão">
          <span className="num font-semibold">{fmtDate(t.next_review)}</span>
          {d != null && <div className={`num text-xs font-medium ${tone}`}>{d < 0 ? `vencida ${fmtCountdown(d)}` : fmtCountdown(d)}</div>}
        </Field>
        <Field label={`Versão ${t.version}`}>
          <span className="num">{fmtDate(t.analysis_date)}</span>
          {age != null && <div className="num text-xs text-ink3">{age === 0 ? 'hoje' : `há ${age} dias`}</div>}
        </Field>
        <Field label="Último balanço">{t.last_balance ?? '—'}</Field>
        <Field label="Horizonte">{t.horizon ?? '—'}{t.philosophy ? ` · ${t.philosophy}` : ''}</Field>
      </div>
      {t.dossier_url && (
        <a href={t.dossier_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
          Abrir dossiê completo <ExternalLink size={14} />
        </a>
      )}
    </div>
  )
}

export function ThesisBody({ t, currency = 'BRL' }: { t: Thesis; currency?: string }) {
  const indicators = t.thesis_indicators ?? []
  const risks = t.thesis_risks ?? []
  return (
    <div className="space-y-2.5">
      <Collapsible title="Tese" defaultOpen>
        <div className="space-y-4">
          <Field label="Qual oportunidade estou identificando?"><p className="prose-pim">{t.opportunity ?? '—'}</p></Field>
          <Field label="Por que pode se valorizar?"><p className="prose-pim">{t.why_appreciate ?? '—'}</p></Field>
          <Field label="O que invalidaria a tese"><p className="prose-pim">{t.invalidation ?? '—'}</p></Field>
          {t.objective && <Field label="Objetivo do investimento"><p className="prose-pim">{t.objective}</p></Field>}
        </div>
      </Collapsible>

      <Collapsible title="Indicadores" meta={`${indicators.length}`}>
        {indicators.length === 0 ? <p className="text-sm text-ink3">Sem indicadores.</p> : (
          <div className="divide-y divide-line">
            {indicators.map((i, n) => (
              <div key={i.id ?? n} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium">
                    {i.name}
                    {i.is_custom && <span className="ml-1.5 text-2xs font-normal text-ink3">personalizado</span>}
                  </span>
                  <span className="num shrink-0 font-semibold">{i.value == null ? '—' : fmtNum(i.value, 4, 0)}</span>
                </div>
                {(i.period || i.note) && (
                  <div className="mt-0.5 text-xs text-ink3">{[i.period, i.note].filter(Boolean).join(' · ')}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Collapsible>

      <Collapsible title="Valuation" meta={t.fair_value_base != null ? `base ${fmtMoney(t.fair_value_base, currency)}` : undefined}>
        <div className="space-y-4">
          <div className="num grid grid-cols-3 gap-2 text-center">
            <Stat label="Pessimista" value={fmtNum(t.fair_value_pess)} tone="bad" />
            <Stat label="Base" value={fmtNum(t.fair_value_base)} />
            <Stat label="Otimista" value={fmtNum(t.fair_value_opt)} tone="info" />
          </div>
          <div className="num text-sm text-ink2">
            Cotação na análise: {fmtMoney(t.price_at_analysis, currency)} em {fmtDate(t.price_ref_date)}
          </div>
          <Field label="Metodologia"><p className="prose-pim">{t.methodology ?? '—'}</p></Field>
          <Field label="Premissas"><p className="prose-pim">{t.assumptions ?? '—'}</p></Field>
        </div>
      </Collapsible>

      <Collapsible title="Estratégia de compra e venda">
        <div className="space-y-4">
          <Field label="Primeira compra planejada"><p className="prose-pim">{t.first_purchase_plan ?? '—'}</p></Field>
          <Field label="Máx. de aportes">{t.max_contributions ?? '—'}</Field>
          <Field label="Compras adicionais"><p className="prose-pim">{t.additional_purchase_criteria ?? '—'}</p></Field>
          <Field label="Não comprar, mesmo no preço"><p className="prose-pim">{t.no_buy_conditions ?? '—'}</p></Field>
          <hr className="border-line" />
          <Field label="Redução ou realização parcial"><p className="prose-pim">{t.reduce_conditions ?? '—'}</p></Field>
          <Field label="Venda integral"><p className="prose-pim">{t.full_sell_conditions ?? '—'}</p></Field>
          <Field label="Manter mesmo após o alvo"><p className="prose-pim">{t.hold_after_target ?? '—'}</p></Field>
        </div>
      </Collapsible>

      <Collapsible title="Riscos" meta={`${risks.length}`}>
        {risks.length === 0 ? <p className="text-sm text-ink3">Sem riscos registrados.</p> : (
          <div className="space-y-3">
            {risks.map((r, n) => {
              const invalidates = /invalida a tese/i.test(r.notes ?? '')
              return (
                <div key={r.id ?? n} className="rounded-xl bg-surface2/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[15px] font-semibold leading-snug">{r.description}</div>
                    {invalidates && <Badge tone="bad">Invalida</Badge>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {r.category && <Badge>{r.category}</Badge>}
                    <Badge tone={levelTone(r.probability, false)}>Prob. {levelLabel(r.probability, 'f')}</Badge>
                    <Badge tone={levelTone(r.impact, false)}>Impacto {levelLabel(r.impact, 'm')}</Badge>
                  </div>
                  {r.notes && <p className="mt-2 text-sm leading-relaxed text-ink2">{r.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </Collapsible>

      {t.data_sources && (
        <Collapsible title="Fontes">
          <p className="prose-pim text-sm text-ink2">{t.data_sources}</p>
        </Collapsible>
      )}
    </div>
  )
}
