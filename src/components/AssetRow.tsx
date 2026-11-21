import { priceMetrics, type AssetBundle } from '@/lib/calc'
import { classificationLabel, classificationTone, phaseLabel, phaseTone } from '@/lib/constants'
import { fmtMoney, fmtPct } from '@/lib/format'
import { Badge, LinkRow } from './ui'

export function ceilingText(price: number | null, maxBuy: number | null | undefined) {
  if (price == null || maxBuy == null) return null
  if (price <= maxBuy) return { tone: 'ok' as const, text: 'Dentro do preço de compra' }
  const over = price / maxBuy - 1
  const fall = 1 - maxBuy / price
  return { tone: 'warn' as const, text: `${fmtPct(over)} acima do teto · falta cair ${fmtPct(fall)}` }
}

export default function AssetRow({ b, showPhase = true }: { b: AssetBundle; showPhase?: boolean }) {
  const { asset, current: t, draft } = b
  const m = priceMetrics(asset.current_price, t)
  const ceil = ceilingText(asset.current_price, t?.max_buy_price)
  return (
    <LinkRow
      href={`/ativos/${asset.id}`}
      right={
        <div className="text-right">
          <div className="num text-[15px] font-semibold">{fmtMoney(asset.current_price, asset.currency)}</div>
          {m?.upside != null && <div className="num text-2xs text-ink3">base {fmtPct(m.upside, 1, true)}</div>}
        </div>
      }
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold">{asset.ticker}</span>
        {t?.classification ? (
          <Badge tone={classificationTone(t.classification)}>{classificationLabel(t.classification)}</Badge>
        ) : showPhase ? (
          <Badge tone={phaseTone(asset.phase)}>{phaseLabel(asset.phase)}</Badge>
        ) : null}
        {draft && <Badge tone="info">v{draft.version} em análise</Badge>}
      </div>
      <div className="truncate text-sm text-ink2">{asset.name}</div>
      {ceil && <div className={`num mt-0.5 text-xs ${ceil.tone === 'ok' ? 'text-ok' : 'text-ink3'}`}>{ceil.text}</div>}
    </LinkRow>
  )
}
