'use client'

import { useState, useTransition } from 'react'
import { addProceed } from '@/actions/transactions'
import { parseBRNumber } from '@/lib/ficha-parser'

type Kind = 'dividendo' | 'jcp' | 'rendimento' | 'outro'

export default function ProceedForm({
  assets, today, defaultAssetId,
}: { assets: { id: string; ticker: string }[]; today: string; defaultAssetId?: string }) {
  const [assetId, setAssetId] = useState(defaultAssetId ?? assets[0]?.id ?? '')
  const [kind, setKind] = useState<Kind>('dividendo')
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  if (assets.length === 0) return <p className="text-sm text-ink2">Registre uma compra antes de lançar proventos.</p>

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="label">Ativo</span>
          <select className="input mt-1" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.ticker}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Tipo</span>
          <select className="input mt-1" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="dividendo">Dividendo</option>
            <option value="jcp">JCP</option>
            <option value="rendimento">Rendimento</option>
            <option value="outro">Outro</option>
          </select>
        </label>
        <label>
          <span className="label">Pagamento</span>
          <input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span className="label">Valor líquido (R$)</span>
          <input inputMode="decimal" className="input num mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </label>
      </div>
      <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observação (opcional)" />
      {msg && <p className={`text-sm ${msg.ok ? 'text-ok' : 'text-bad'}`}>{msg.text}</p>}
      <button
        type="button"
        className="btn-primary w-full"
        disabled={pending}
        onClick={() => {
          const v = parseBRNumber(amount)
          if (v == null || v <= 0) return setMsg({ text: 'Informe o valor.' })
          start(async () => {
            const r = await addProceed({ asset_id: assetId, kind, pay_date: date, amount: v, notes: notes || null })
            if (r && 'error' in r && r.error) setMsg({ text: r.error })
            else { setMsg({ ok: true, text: 'Provento registrado.' }); setAmount(''); setNotes('') }
          })
        }}
      >
        {pending ? 'Salvando…' : 'Registrar provento'}
      </button>
    </div>
  )
}
