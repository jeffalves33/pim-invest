import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { deleteAsset, updateAsset } from '@/actions/assets'
import AssetForm from '@/components/AssetForm'
import ConfirmButton from '@/components/ConfirmButton'
import { Page, PageHeader, Section } from '@/components/ui'
import { requireUser } from '@/lib/supabase/server'
import type { Asset } from '@/lib/types'

export const metadata: Metadata = { title: 'Editar ativo' }

export default async function EditarAtivo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireUser()
  const { data } = await supabase.from('assets').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  const asset = data as Asset

  return (
    <>
      <PageHeader title={`Editar ${asset.ticker}`} back={`/ativos/${id}`} />
      <Page>
        <AssetForm action={updateAsset.bind(null, id)} asset={asset} />
        <Section title="Zona de perigo" className="pt-6">
          <div className="card-pad space-y-3">
            <p className="text-sm text-ink2">
              Excluir o ativo apaga também todas as versões de tese, operações, proventos e cotações dele. Para tirar o ativo do radar sem perder o histórico, use a fase “Encerrado / Descartado”.
            </p>
            <ConfirmButton action={deleteAsset.bind(null, id)} confirmText="Toque de novo para excluir tudo" className="btn-danger w-full">
              Excluir {asset.ticker}
            </ConfirmButton>
          </div>
        </Section>
      </Page>
    </>
  )
}
