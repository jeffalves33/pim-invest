import type { Metadata } from 'next'
import { createAsset } from '@/actions/assets'
import AssetForm from '@/components/AssetForm'
import { Page, PageHeader } from '@/components/ui'

export const metadata: Metadata = { title: 'Novo ativo' }

export default function NovoAtivo() {
  return (
    <>
      <PageHeader title="Novo ativo" back="/ativos" />
      <Page>
        <AssetForm action={createAsset} />
      </Page>
    </>
  )
}
