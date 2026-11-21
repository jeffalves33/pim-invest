'use client'

import { useMemo, useState, useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import { addTransaction } from '@/actions/transactions'
import { parseBRNumber } from '@/lib/ficha-parser'
import { fmtMoney, fmtNum, toInputNumber } from '@/lib/format'

export default function TransactionForm({
  assetId, ticker, today, maxBuy, approved, hasThesis, classificationLabel, held, currentPrice, onDone,
}: {
  assetId: string
  ticker: string
  today: string
  maxBuy: number | null
  approved: boolean
  hasThesis: boolean
  classificationLabel: string
  held: number
  currentPrice: number | null
  onDone?: () => void
}) {
  const [type, setType] = useState<'buy' | 'sell'>('buy')
  const [date, setDate] = useState(today)
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState(toInputNumber(currentPrice))
  const [fees, setFees] = useState('')
  const [notes, setNotes] = useState('')
  const [why, setWhy] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const p = parseBRNumber(price)
  const q = parseBRNumber(qty)
  const reasons = useMemo(() => {
    if (type !== 'buy') return []
    const r: string[] = []
    if (!hasThesis) r.push('não há tese vigente')
    else {
      if (!approved) r.push(`a classificação é "${classificationLabel}"`)
      if (maxBuy != null && p != null && p > maxBuy) r.push(`o preço está acima do máximo de ${fmtMoney(maxBuy)}`)
    }
    return r
  }, [type, hasThesis, approved, classificationLabel, maxBuy, p])
  const outside = reasons.length > 0
  const total = p != null && q != null ? p * q + (parseBRNumber(fees) ?? 0) * (type === 'buy' ? 1 : -1) : null

  function submit() {
    setError(null)
    setDone(null)
    if (q == null || q <= 0) return setError('Informe a quantidade.')
    if (p == null || p < 0) return setError('Informe o preço.')
    if (outside && !why.trim()) return setError('Escreva por que esta compra é uma exceção.')
    start(async () => {
      const r = await addTransaction({
        asset_id: assetId, type, trade_date: date, quantity: q, price: p,
        fees: parseBRNumber(fees) ?? 0, notes: notes || null, exception_justification: outside ? why : null,
      })
      if (r && 'error' in r && r.error) { setError(r.error); return }
      setDone(`${type === 'buy' ? 'Compra' : 'Venda'} registrada.`)
      setQty(''); setFees(''); setNotes(''); setWhy('')
      onDone?.()
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1">
        {(['buy', 'sell'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-lg py-2 text-sm font-semibold ${type === t ? 'bg-surface shadow-sm' : 'text-ink3'}`}
          >
            {t === 'buy' ? 'Compra' : 'Venda'}
          </button>
        ))}
      </div>

      {outside && (
        <div className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-warn">
            <AlertTriangle size={16} /> Compra fora dos critérios da tese
          </div>
          <p className="mt-1 text-ink2">Motivo: {reasons.join('; ')}.</p>
          <label className="mt-2 block">
            <span className="label">Justificativa da exceção (obrigatória)</span>
            <textarea className="textarea mt-1" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Por que comprar mesmo assim?" />
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="label">Data</span>
          <input type="date" className="input mt-1" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span className="label">Quantidade{type === 'sell' ? ` (tem ${fmtNum(held, 6, 0)})` : ''}</span>
          <input inputMode="decimal" className="input num mt-1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
        </label>
        <label>
          <span className="label">Preço (R$)</span>
          <input inputMode="decimal" className="input num mt-1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
        </label>
        <label>
          <span className="label">Custos (R$)</span>
          <input inputMode="decimal" className="input num mt-1" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0,00" />
        </label>
      </div>
      <label className="block">
        <span className="label">Observação</span>
        <input className="input mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </label>

      {total != null && (
        <p className="num text-sm text-ink2">
          Total: <b className="text-ink">{fmtMoney(total)}</b> · {ticker}
        </p>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      {done && <p className="text-sm text-ok">{done}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className={outside ? 'btn-secondary w-full border-warn/50 text-warn' : 'btn-primary w-full'}
      >
        {pending ? 'Registrando…' : outside ? 'Registrar exceção' : type === 'buy' ? 'Registrar compra' : 'Registrar venda'}
      </button>
    </div>
  )
}
