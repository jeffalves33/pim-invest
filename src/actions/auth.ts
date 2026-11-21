'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { str, type FormState } from '@/lib/form'

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email')
  const password = str(fd, 'password')
  if (!email || !password) return { error: 'Informe e-mail e senha.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message }
  redirect('/dashboard')
}

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email')
  const password = str(fd, 'password')
  if (!email || !password) return { error: 'Informe e-mail e senha.' }
  if (password.length < 8) return { error: 'Use uma senha com pelo menos 8 caracteres.' }
  const h = await headers()
  const origin = h.get('origin') ?? `https://${h.get('host')}`
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })
  if (error) return { error: error.message }
  if (data.session) redirect('/dashboard')
  return { ok: true, message: 'Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
