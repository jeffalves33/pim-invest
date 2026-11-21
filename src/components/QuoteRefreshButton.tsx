'use client'

import { useEffect, useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { refreshAllQuotes, refreshQuote } from '@/actions/quotes'
import type { FormState } from '@/lib/form'

/**
 * Ícone de atualização: com assetId atualiza um ativo; sem assetId, todos.
 * Mostra o resultado em um aviso curto logo abaixo.
 */
export default function QuoteRefreshButton({ assetId, label }: { assetId?: string; label?: string }) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<FormState>(undefined)

  useEffect(() => {
    if (!result) return
    const t = setTimeout(() => setResult(undefined), result.error ? 8000 : 3500)
    return () => clearTimeout(t)
  }, [result])

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label ?? (assetId ? 'Atualizar cotação' : 'Atualizar todas as cotações')}
        disabled={pending}
        onClick={() => start(async () => setResult(await (assetId ? refreshQuote(assetId) : refreshAllQuotes())))}
        className={`inline-flex items-center gap-1.5 rounded-full p-2 text-accent active:bg-surface2 disabled:opacity-60 ${label ? 'px-3 text-sm font-medium' : ''}`}
      >
        <RefreshCw size={label ? 16 : 19} className={pending ? 'animate-spin' : ''} />
        {label && (pending ? 'Atualizando…' : label)}
      </button>
      {result && (
        <span
          role="status"
          className={`absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border px-3 py-2 text-xs shadow-lg ${
            result.error ? 'border-bad/30 bg-surface text-bad' : 'border-ok/30 bg-surface text-ok'
          }`}
        >
          {result.error ?? result.message ?? 'Atualizado.'}
        </span>
      )}
    </span>
  )
}
