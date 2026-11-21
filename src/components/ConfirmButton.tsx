'use client'

import { useState, useTransition } from 'react'

/** Botão de ação destrutiva com confirmação em dois toques (sem diálogos do navegador). */
export default function ConfirmButton({
  action, children, confirmText = 'Toque de novo para confirmar', className = 'btn-danger',
}: {
  action: () => Promise<unknown>
  children: React.ReactNode
  confirmText?: string
  className?: string
}) {
  const [armed, setArmed] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="inline-flex flex-col items-stretch">
      <button
        type="button"
        className={className}
        disabled={pending}
        onBlur={() => setArmed(false)}
        onClick={() => {
          if (!armed) { setArmed(true); return }
          start(async () => {
            const r = (await action()) as { error?: string } | undefined
            if (r?.error) setError(r.error)
            setArmed(false)
          })
        }}
      >
        {pending ? 'Aguarde…' : armed ? confirmText : children}
      </button>
      {error && <span className="mt-1 text-xs text-bad">{error}</span>}
    </div>
  )
}
