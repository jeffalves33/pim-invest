'use client'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md space-y-4 px-6 pt-24 text-center">
      <h1 className="text-lg font-semibold">Algo deu errado</h1>
      <p className="text-sm text-ink2">{error.message || 'Erro inesperado.'}</p>
      <button type="button" className="btn-primary" onClick={reset}>Tentar de novo</button>
    </main>
  )
}
