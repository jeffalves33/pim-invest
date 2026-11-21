/**
 * Gera SQL de carga (ativo + tese vigente) a partir de uma ficha em texto.
 *
 * Uso:
 *   npx tsx scripts/ficha-to-sql.ts supabase/fichas/BBAS3.asset.json supabase/fichas/BBAS3_v1.txt [mais pares…] > carga.sql
 *
 * O SQL usa o primeiro usuário de auth.users (o dono do app). Rode no SQL Editor
 * do Supabase depois de criar sua conta pelo app.
 */
import { readFileSync } from 'node:fs'
import { parseFicha, type ParsedFicha } from '../src/lib/ficha-parser'
import { emptyThesisCore, THESIS_CORE_KEYS, type ThesisCore } from '../src/lib/types'

export interface AssetSeed {
  ticker: string
  name: string
  related_tickers?: string | null
  asset_class: string
  sector?: string | null
  category?: string | null
  market?: string | null
  currency?: string
  country?: string
  website?: string | null
  ri_site?: string | null
  description?: string | null
  phase: string
  current_price?: number | null
  price_date?: string | null
  price_source?: string | null
  market_cap?: number | null
  dossier_url?: string | null
}

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return `'${String(v).replace(/'/g, "''")}'`
}

const ASSET_COLS: (keyof AssetSeed)[] = [
  'ticker', 'name', 'related_tickers', 'asset_class', 'sector', 'category', 'market', 'currency',
  'country', 'website', 'ri_site', 'description', 'phase', 'current_price', 'price_date',
  'price_source', 'market_cap',
]

export function assetSeedSQL(asset: AssetSeed, p: ParsedFicha): string {
  if (p.warnings.length) {
    throw new Error(`Ficha de ${asset.ticker} com avisos:\n- ${p.warnings.join('\n- ')}`)
  }
  const core: ThesisCore = { ...emptyThesisCore(), ...p.core, dossier_url: asset.dossier_url ?? p.core.dossier_url ?? null }
  const version = p.version ?? 1
  const a = { currency: 'BRL', country: 'Brasil', ...asset, ticker: asset.ticker.toUpperCase() }

  const assetCols = ASSET_COLS.filter((c) => a[c] !== undefined)
  const updates = assetCols.filter((c) => c !== 'ticker').map((c) => `${c} = excluded.${c}`)

  const L: string[] = []
  L.push(`-- ${a.ticker} — ${a.name} · tese v${version} (${core.analysis_date ?? 's/ data'})`)
  L.push('do $pim$')
  L.push('declare')
  L.push('  v_user   uuid := (select id from auth.users order by created_at limit 1);')
  L.push('  v_asset  uuid;')
  L.push('  v_thesis uuid;')
  L.push('begin')
  L.push(`  if v_user is null then`)
  L.push(`    raise exception 'Nenhum usuário em auth.users. Crie sua conta pelo app antes de rodar este seed.';`)
  L.push('  end if;')
  L.push('')
  L.push(`  insert into public.assets (user_id, ${assetCols.join(', ')}, price_updated_at)`)
  L.push(`  values (v_user, ${assetCols.map((c) => q(a[c])).join(', ')}, now())`)
  L.push(`  on conflict (user_id, ticker) do update set ${updates.join(', ')}`)
  L.push('  returning id into v_asset;')
  L.push('')
  L.push(`  if exists (select 1 from public.theses where asset_id = v_asset and version = ${version}) then`)
  L.push(`    raise notice '${a.ticker}: tese v${version} já existe; nada foi inserido.';`)
  L.push('    return;')
  L.push('  end if;')
  L.push('')
  const tCols = THESIS_CORE_KEYS
  L.push(`  insert into public.theses (user_id, asset_id, version, status, ${tCols.join(', ')})`)
  L.push(`  values (v_user, v_asset, ${version}, 'current',`)
  L.push('    ' + tCols.map((c) => q(core[c])).join(',\n    '))
  L.push('  )')
  L.push('  returning id into v_thesis;')

  if (p.indicators.length) {
    L.push('')
    L.push('  insert into public.thesis_indicators (user_id, thesis_id, name, value, period, note, is_custom, sort) values')
    L.push(p.indicators.map((i, n) => `    (v_user, v_thesis, ${q(i.name)}, ${q(i.value)}, ${q(i.period)}, ${q(i.note)}, ${q(i.is_custom)}, ${n})`).join(',\n') + ';')
  }
  if (p.triggers.length) {
    L.push('')
    L.push('  insert into public.thesis_triggers (user_id, thesis_id, indicator, condition, limit_value, current_value, value_date, sort) values')
    L.push(p.triggers.map((t, n) => `    (v_user, v_thesis, ${q(t.indicator)}, ${q(t.condition)}, ${q(t.limit_value)}, ${q(t.current_value)}, ${q(t.value_date)}, ${n})`).join(',\n') + ';')
  }
  if (p.events.length) {
    L.push('')
    L.push('  insert into public.thesis_events (user_id, thesis_id, event_date, description) values')
    L.push(p.events.map((e) => `    (v_user, v_thesis, ${q(e.event_date)}, ${q(e.description)})`).join(',\n') + ';')
  }
  if (p.risks.length) {
    L.push('')
    L.push('  insert into public.thesis_risks (user_id, thesis_id, description, category, probability, impact, notes, sort) values')
    L.push(p.risks.map((r, n) => `    (v_user, v_thesis, ${q(r.description)}, ${q(r.category)}, ${q(r.probability)}, ${q(r.impact)}, ${q(r.notes)}, ${n})`).join(',\n') + ';')
  }
  if (a.current_price != null && a.price_date) {
    L.push('')
    L.push('  insert into public.price_history (user_id, asset_id, price_date, price, source)')
    L.push(`  values (v_user, v_asset, ${q(a.price_date)}, ${q(a.current_price)}, ${q(a.price_source ?? 'análise')})`)
    L.push('  on conflict (asset_id, price_date) do nothing;')
  }
  L.push('')
  L.push('  insert into public.activity_log (user_id, asset_id, thesis_id, action, summary)')
  L.push(`  values (v_user, v_asset, v_thesis, 'thesis_concluded', ${q(`Tese v${version} de ${a.ticker} importada (carga inicial)`)});`)
  L.push('end')
  L.push('$pim$;')
  return L.join('\n')
}

// ---------------------------------------------------------------- CLI
const isMain = process.argv[1] && /ficha-to-sql\.ts$/.test(process.argv[1])
if (isMain) {
  const args = process.argv.slice(2)
  if (args.length < 2 || args.length % 2 !== 0) {
    console.error('Uso: tsx scripts/ficha-to-sql.ts <ativo.json> <ficha.txt> [<ativo.json> <ficha.txt> …]')
    process.exit(1)
  }
  const out: string[] = [
    '-- Gerado por scripts/ficha-to-sql.ts — rode no SQL Editor do Supabase depois do schema.sql',
    '-- e depois de criar sua conta pelo app. Pode rodar de novo: não duplica.',
    '',
  ]
  for (let i = 0; i < args.length; i += 2) {
    const asset = JSON.parse(readFileSync(args[i], 'utf8')) as AssetSeed
    const parsed = parseFicha(readFileSync(args[i + 1], 'utf8'))
    out.push(assetSeedSQL(asset, parsed), '')
  }
  process.stdout.write(out.join('\n'))
}
