import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { deleteDraft } from '@/actions/theses'
import ConfirmButton from '@/components/ConfirmButton'
import ThesisEditor, { type EditorInitial } from '@/components/ThesisEditor'
import { Notice, Page, PageHeader } from '@/components/ui'
import { THESIS_FULL_SELECT, normalizeThesis } from '@/lib/data'
import { requireUser } from '@/lib/supabase/server'
import { THESIS_CORE_KEYS, emptyThesisCore, type Asset, type Thesis, type ThesisCore } from '@/lib/types'

export const metadata: Metadata = { title: 'Editar tese' }
export const dynamic = 'force-dynamic'

export default async function EditarTese({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireUser()
  const { data } = await supabase.from('theses').select(THESIS_FULL_SELECT).eq('id', id).maybeSingle()
  if (!data) notFound()
  const t = normalizeThesis(data as Thesis)
  const { data: assetData } = await supabase.from('assets').select('*').eq('id', t.asset_id).single()
  const asset = assetData as Asset

  const core: ThesisCore = emptyThesisCore()
  for (const k of THESIS_CORE_KEYS) (core as unknown as Record<string, unknown>)[k] = t[k]

  const initial: EditorInitial = {
    id: t.id,
    version: t.version,
    status: t.status,
    core,
    indicators: t.thesis_indicators ?? [],
    triggers: t.thesis_triggers ?? [],
    events: t.thesis_events ?? [],
    risks: t.thesis_risks ?? [],
  }
  const isDraft = t.status === 'draft'

  return (
    <>
      <PageHeader
        back={`/ativos/${asset.id}`}
        title={`${asset.ticker} · v${t.version}`}
        subtitle={isDraft ? 'rascunho' : t.status === 'current' ? 'correção da versão vigente' : 'correção de versão anterior'}
      />
      <Page>
        {!isDraft && (
          <Notice tone="warn">
            Você está corrigindo uma versão já concluída. Para registrar uma nova análise (resultado novo, premissas revistas), crie uma nova versão.
          </Notice>
        )}
        <ThesisEditor
          assetId={asset.id}
          ticker={asset.ticker}
          currentPrice={asset.current_price}
          initial={initial}
          extra={isDraft ? (
            <div className="pt-4">
              <ConfirmButton action={deleteDraft.bind(null, t.id)} confirmText="Toque de novo para descartar" className="btn-danger w-full">
                Descartar rascunho
              </ConfirmButton>
            </div>
          ) : undefined}
        />
      </Page>
    </>
  )
}
