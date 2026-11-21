'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, CircleHelp, Pencil, XCircle } from 'lucide-react'
import { updateTrigger } from '@/actions/theses'
import { triggerSlack, triggerState } from '@/lib/calc'
import { parseBRNumber } from '@/lib/ficha-parser'
import { fmtDate, fmtNum, fmtPct, toInputNumber } from '@/lib/format'
import type { ThesisTrigger } from '@/lib/types'

/** Linha de gatilho com status e atualização rápida do valor atual. */
export default function TriggerRow({ trigger, today, editable }: { trigger: ThesisTrigger; today: string; editable: boolean }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(toInputNumber(trigger.current_value, 4))
  const [date, setDate] = useState(trigger.value_date ?? today)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const state = triggerState(trigger)
  const slack = triggerSlack(trigger)
  const Icon = state === 'broken' ? XCircle : state === 'ok' ? CheckCircle2 : CircleHelp
  const color = state === 'broken' ? 'text-bad' : state === 'ok' ? 'text-ok' : 'text-ink3'
  const near = state === 'ok' && slack != null && slack < 0.1

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <Icon size={20} className={`mt-0.5 shrink-0 ${near ? 'text-warn' : color}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium leading-snug">{trigger.indicator}</div>
          <div className="num mt-0.5 text-sm text-ink2">
            Atual <b className="text-ink">{fmtNum(trigger.current_value, 4, 0)}</b>
            {' · '}rompe se {trigger.condition === 'lt' ? '<' : '>'} {fmtNum(trigger.limit_value, 4, 0)}
          </div>
          <div className="mt-0.5 text-2xs text-ink3">
            {state === 'broken' ? 'Rompido' : state === 'ok' ? `Folga de ${fmtPct(slack)}` : 'Sem valor atual'}
            {trigger.value_date ? ` · dado de ${fmtDate(trigger.value_date)}` : ''}
          </div>
        </div>
        {editable && trigger.id && !editing && (
          <button type="button" aria-label="Atualizar valor" className="rounded-full p-2 text-ink3 active:bg-surface2" onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </button>
        )}
      </div>
      {editing && (
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <label>
            <span className="label">Valor atual</span>
            <input className="input num mt-1" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <label>
            <span className="label">Data do dado</span>
            <input className="input mt-1" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() => start(async () => {
              const r = await updateTrigger(trigger.id!, parseBRNumber(value), date || null)
              if (r && 'error' in r && r.error) setError(r.error)
              else setEditing(false)
            })}
          >
            {pending ? '…' : 'Salvar'}
          </button>
          {error && <p className="col-span-3 text-sm text-bad">{error}</p>}
        </div>
      )}
    </div>
  )
}
