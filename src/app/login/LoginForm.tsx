'use client'

import { useActionState, useState } from 'react'
import { signIn, signUp } from '@/actions/auth'
import SubmitButton from '@/components/SubmitButton'
import type { FormState } from '@/lib/form'

export default function LoginForm() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [inState, inAction] = useActionState<FormState, FormData>(signIn, undefined)
  const [upState, upAction] = useActionState<FormState, FormData>(signUp, undefined)
  const state = mode === 'in' ? inState : upState

  return (
    <form action={mode === 'in' ? inAction : upAction} className="space-y-3">
      <label className="block">
        <span className="label">E-mail</span>
        <input name="email" type="email" autoComplete="email" required className="input mt-1" />
      </label>
      <label className="block">
        <span className="label">Senha</span>
        <input name="password" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={mode === 'up' ? 8 : undefined} className="input mt-1" />
      </label>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      {state?.ok && state.message && <p className="text-sm text-ok">{state.message}</p>}
      <SubmitButton pendingText="Aguarde…">{mode === 'in' ? 'Entrar' : 'Criar conta'}</SubmitButton>
      <button type="button" className="btn-ghost w-full" onClick={() => setMode((m) => (m === 'in' ? 'up' : 'in'))}>
        {mode === 'in' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta'}
      </button>
    </form>
  )
}
