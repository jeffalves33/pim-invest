'use client'

import { useActionState } from 'react'
import { ASSET_CLASSES, PHASES } from '@/lib/constants'
import { toInputNumber } from '@/lib/format'
import type { FormState } from '@/lib/form'
import type { Asset } from '@/lib/types'
import SubmitButton from './SubmitButton'

export default function AssetForm({
  action, asset,
}: { action: (prev: FormState, fd: FormData) => Promise<FormState>; asset?: Partial<Asset> }) {
  const [state, formAction] = useActionState(action, undefined)
  const a = asset ?? {}

  return (
    <form action={formAction} className="space-y-4">
      <div className="card-pad space-y-3">
        <div className="grid grid-cols-[1fr_1.4fr] gap-2">
          <label>
            <span className="label">Ticker *</span>
            <input name="ticker" defaultValue={a.ticker} required autoCapitalize="characters" autoCorrect="off" className="input mt-1 uppercase" placeholder="BBAS3" />
          </label>
          <label>
            <span className="label">Classe</span>
            <select name="asset_class" defaultValue={a.asset_class ?? 'acao'} className="input mt-1">
              {ASSET_CLASSES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="label">Nome *</span>
          <input name="name" defaultValue={a.name} required className="input mt-1" placeholder="Banco do Brasil S.A." />
        </label>
        <label className="block">
          <span className="label">Fase</span>
          <select name="phase" defaultValue={a.phase ?? 'f1'} className="input mt-1">
            {PHASES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Outros tickers relacionados</span>
          <input name="related_tickers" defaultValue={a.related_tickers ?? ''} className="input mt-1" />
        </label>
      </div>

      <div className="card-pad space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Setor</span>
            <input name="sector" defaultValue={a.sector ?? ''} className="input mt-1" />
          </label>
          <label>
            <span className="label">Mercado/Bolsa</span>
            <input name="market" defaultValue={a.market ?? ''} className="input mt-1" placeholder="B3 — Novo Mercado" />
          </label>
        </div>
        <label className="block">
          <span className="label">Categoria</span>
          <input name="category" defaultValue={a.category ?? ''} className="input mt-1" />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label>
            <span className="label">Moeda</span>
            <input name="currency" defaultValue={a.currency ?? 'BRL'} className="input mt-1" />
          </label>
          <label>
            <span className="label">País</span>
            <input name="country" defaultValue={a.country ?? 'Brasil'} className="input mt-1" />
          </label>
          <label>
            <span className="label">Valor merc. (R$ bi)</span>
            <input name="market_cap_bi" inputMode="decimal" defaultValue={a.market_cap ? toInputNumber(a.market_cap / 1e9, 2) : ''} className="input num mt-1" />
          </label>
        </div>
        <label className="block">
          <span className="label">Site institucional</span>
          <input name="website" type="url" defaultValue={a.website ?? ''} className="input mt-1" placeholder="https://" />
        </label>
        <label className="block">
          <span className="label">Site de RI</span>
          <input name="ri_site" type="url" defaultValue={a.ri_site ?? ''} className="input mt-1" placeholder="https://" />
        </label>
      </div>

      <div className="card-pad space-y-3">
        <label className="block">
          <span className="label">Descrição do ativo</span>
          <textarea name="description" defaultValue={a.description ?? ''} rows={8} className="textarea mt-1" />
        </label>
        <label className="block">
          <span className="label">Anotações</span>
          <textarea name="notes" defaultValue={a.notes ?? ''} rows={3} className="textarea mt-1" />
        </label>
      </div>

      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <SubmitButton>{asset?.id ? 'Salvar alterações' : 'Cadastrar ativo'}</SubmitButton>
    </form>
  )
}
