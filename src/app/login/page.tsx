import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Entrar' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <main className="safe-top mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
        <div>
          <h1 className="text-xl font-bold">PIM</h1>
          <p className="text-sm text-ink3">Personal Investment Management</p>
        </div>
      </div>
      {erro && <p className="mb-4 rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">Não foi possível confirmar o acesso. Tente entrar de novo.</p>}
      <LoginForm />
    </main>
  )
}
