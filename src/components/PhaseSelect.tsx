'use client'

import { useState, useTransition } from 'react'
import { setPhase } from '@/actions/assets'
import { PHASES, type Tone } from '@/lib/constants'
import type { Phase } from '@/lib/types'

const ring: Record<Tone, string> = {
  ok: 'border-ok/40 text-ok bg-ok/10', warn: 'border-warn/40 text-warn bg-warn/10', bad: 'border-bad/40 text-bad bg-bad/10',
  info: 'border-info/40 text-info bg-info/10', muted: 'border-line text-ink2 bg-surface2', accent: 'border-accent/40 text-accent bg-accent/10',
}

/** Chip único da fase; toque para trocar. */
export default function PhaseSelect({ assetId, phase }: { assetId: string; phase: Phase }) {
  const [value, setValue] = useState(phase)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const tone = PHASES.find((p) => p.key === value)?.tone ?? 'muted'

  return (
    <div className="inline-flex flex-col">
      <select
        aria-label="Fase do ativo"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Phase
          const prev = value
          setValue(next)
          setError(null)
          start(async () => {
            const r = await setPhase(assetId, next)
            if (r && 'error' in r && r.error) { setValue(prev); setError(r.error) }
          })
        }}
        className={`chip appearance-none border pr-3 text-xs font-semibold ${ring[tone]} ${pending ? 'opacity-60' : ''}`}
        style={{ fontSize: 12 }}
      >
        {PHASES.map((p) => (
          <option key={p.key} value={p.key}>{p.label}</option>
        ))}
      </select>
      {error && <span className="mt-1 text-2xs text-bad">{error}</span>}
    </div>
  )
}
