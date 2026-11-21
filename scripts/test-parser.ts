/**
 * Testes do leitor de fichas e dos cálculos. Rode: npm run test:parser
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { autoMaxBuy, priceMetrics, triggerState, assetAlerts } from '../src/lib/calc'
import { parseBRDate, parseBRNumber, parseFicha } from '../src/lib/ficha-parser'
import { thesisToFicha } from '../src/lib/ficha-format'
import { businessDaysBetween, daysBetween, fmtDate } from '../src/lib/format'
import { emptyThesisCore, type Asset, type Thesis } from '../src/lib/types'

let n = 0
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`) }

ok('números no formato brasileiro', () => {
  assert.equal(parseBRNumber('1.234,56'), 1234.56)
  assert.equal(parseBRNumber('12,60 (automático)'), 12.6)
  assert.equal(parseBRNumber('—'), null)
  assert.equal(parseBRNumber('R$ 84.700'), 84700)
  assert.equal(parseBRNumber('-2,5%'), -2.5)
})

ok('datas', () => {
  assert.equal(parseBRDate('31/02/2026'), null)
  assert.equal(parseBRDate('6/1/2027'), '2027-01-06')
  assert.equal(fmtDate('2026-11-17'), '17/11/2026')
  assert.equal(daysBetween('2026-11-20', '2027-02-19'), 91)
  assert.equal(businessDaysBetween('2026-11-13', '2026-11-20'), 5) // sex → sex
})

const dir = join(__dirname, '..', 'supabase', 'fichas')
for (const f of ['BBAS3_v1', 'SAPR11_v1']) {
  ok(`ficha ${f}: leitura sem avisos e ida e volta`, () => {
    const p = parseFicha(readFileSync(join(dir, `${f}.txt`), 'utf8'))
    assert.deepEqual(p.warnings, [])
    assert.equal(p.risks.length, 8)
    assert.ok(p.indicators.length >= 9)
    const core = { ...emptyThesisCore(), ...p.core }
    const back = parseFicha(thesisToFicha({ version: p.version, core, indicators: p.indicators, triggers: p.triggers, events: p.events, risks: p.risks }))
    assert.deepEqual(back.core, p.core)
    assert.deepEqual(back.triggers, p.triggers)
    assert.deepEqual(back.events, p.events)
    assert.deepEqual(back.risks, p.risks)
  })
}

ok('preço máximo e métricas de preço (BBAS3)', () => {
  assert.equal(autoMaxBuy(18, 30), 12.6)
  const m = priceMetrics(14.84, { fair_value_pess: 12, fair_value_base: 18, fair_value_opt: 30, max_buy_price: 12.6 })!
  assert.equal(m.aboveCeiling, true)
  assert.equal(Math.round(m.upside! * 1000) / 10, 21.3)
  assert.equal(Math.round(m.downside! * 1000) / 10, -19.1)
  assert.equal(Math.round(m.ratio! * 100) / 100, 1.11)
  assert.equal(Math.round(m.distToCeiling! * 1000) / 10, 15.1) // falta cair 15,1%
  assert.equal(Math.round(m.overCeiling! * 1000) / 10, 17.8) // 17,8% acima do teto
})

ok('gatilhos', () => {
  assert.equal(triggerState({ condition: 'gt', limit_value: 7, current_value: 6.08 }), 'ok')
  assert.equal(triggerState({ condition: 'gt', limit_value: 7, current_value: 7.2 }), 'broken')
  assert.equal(triggerState({ condition: 'lt', limit_value: 10, current_value: 9.9 }), 'broken')
  assert.equal(triggerState({ condition: 'lt', limit_value: 10, current_value: null }), 'unknown')
})

ok('alertas do painel', () => {
  const asset = { id: 'a', ticker: 'BBAS3', phase: 'f3', current_price: 12.5, price_date: '2026-11-12' } as Asset
  const t = {
    ...emptyThesisCore(), id: 't', version: 1, status: 'current', classification: 'observacao',
    next_review: '2026-11-30', max_buy_price: 12.6,
    thesis_triggers: [{ indicator: 'CET1', condition: 'lt', limit_value: 10, current_value: 9.5, value_date: null }],
    thesis_events: [{ event_date: '2026-12-10', description: 'JCP' }],
  } as unknown as Thesis
  const kinds = assetAlerts({ asset, current: t, draft: null }, '2026-11-20').map((a) => a.kind).sort()
  assert.deepEqual(kinds, ['event_soon', 'opportunity', 'price_stale', 'review_soon', 'trigger_broken'])
})

console.log(`\n${n} testes passaram`)
