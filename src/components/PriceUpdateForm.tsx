'use client'

import { useActionState, useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { refreshQuote, updatePriceManual } from '@/actions/quotes'
import SubmitButton from './SubmitButton'
import type { FormState } from '@/lib/form'

export default function PriceUpdateForm({
  assetId, today, canFetch,
}: { assetId: string; today: string; canFetch: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(updatePriceManual.bind(null, assetId), undefined)
  const [fetchState, setFetchState] = useState<FormState>(undefined)
  const [pending, start] = useTransition()
  const msg = fetchState ?? state

  return (
    <div className="space-y-3">
      {canFetch && (
        <button
          type="button"
          className="btn-secondary w-full"
          disabled={pending}
          onClick={() => start(async () => setFetchState(await refreshQuote(assetId)))}
        >
          <RefreshCw size={16} className={pending ? 'animate-spin' : ''} />
          {pending ? 'Buscando…' : 'Buscar cotação (brapi)'}
        </button>
      )}
      <form action={(fd) => { setFetchState(undefined); action(fd) }} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <label className="block">
          <span className="label">Cotação (R$)</span>
          <input name="price" inputMode="decimal" placeholder="0,00" className="input num mt-1" required />
        </label>
        <label className="block">
          <span className="label">Data</span>
          <input name="price_date" type="date" defaultValue={today} max={today} className="input mt-1" required />
        </label>
        <SubmitButton className="btn-primary" pendingText="…">Salvar</SubmitButton>
      </form>
      {msg?.error && <p className="text-sm text-bad">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-ok">{msg.message ?? 'Atualizado.'}</p>}
    </div>
  )
}
