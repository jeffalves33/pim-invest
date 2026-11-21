'use client'

import { useOptimistic, useTransition } from 'react'
import { CalendarDays, Check } from 'lucide-react'
import { toggleEventDone } from '@/actions/theses'
import { daysBetween, fmtCountdown, fmtDate } from '@/lib/format'
import type { ThesisEvent } from '@/lib/types'

export default function EventItem({ event, today, editable }: { event: ThesisEvent; today: string; editable: boolean }) {
  const [done, setDone] = useOptimistic(!!event.done)
  const [, start] = useTransition()
  const d = daysBetween(today, event.event_date)
  const soon = !done && d >= 0 && d <= 30
  const past = d < 0

  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${done ? 'opacity-55' : ''}`}>
      <CalendarDays size={18} className={`mt-0.5 shrink-0 ${soon ? 'text-info' : 'text-ink3'}`} />
      <div className="min-w-0 flex-1">
        <div className={`text-[15px] leading-snug ${done ? 'line-through' : ''}`}>{event.description}</div>
        <div className="num mt-0.5 text-xs text-ink3">
          {fmtDate(event.event_date)} · {fmtCountdown(d)}
          {past && !done ? ' · confirmar se aconteceu' : ''}
        </div>
      </div>
      {editable && event.id && (
        <button
          type="button"
          aria-label={done ? 'Marcar como pendente' : 'Marcar como acompanhado'}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${done ? 'border-ok bg-ok text-white dark:text-black' : 'border-line text-transparent'}`}
          onClick={() => start(async () => {
            setDone(!done)
            await toggleEventDone(event.id!, !done)
          })}
        >
          <Check size={15} strokeWidth={3} />
        </button>
      )}
    </div>
  )
}
