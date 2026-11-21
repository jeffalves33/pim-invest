import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-6 pt-24 text-center">
      <h1 className="text-lg font-semibold">Não encontrado</h1>
      <p className="text-sm text-ink2">Este item não existe ou foi removido.</p>
      <Link href="/dashboard" className="btn-primary">Ir para o painel</Link>
    </main>
  )
}
