'use client'

import { useFormStatus } from 'react-dom'

export default function SubmitButton({
  children, pendingText = 'Salvando…', className = 'btn-primary w-full',
}: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  )
}
