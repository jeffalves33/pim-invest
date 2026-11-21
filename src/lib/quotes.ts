/**
 * Cotações pela brapi.dev (B3).
 * Plano gratuito: 15.000 requisições/mês, 1 ticker por chamada, atraso de ~30 min.
 * Sem token só funcionam os tickers de teste (PETR4, VALE3, MGLU3, ITUB4).
 */
export interface Quote {
  ticker: string
  price: number
  date: string // YYYY-MM-DD (São Paulo)
  marketCap: number | null
  source: string
}

export async function fetchQuote(ticker: string): Promise<Quote> {
  const token = process.env.BRAPI_TOKEN
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { cache: 'no-store', headers })
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(token
        ? 'Token da brapi inválido. Confira BRAPI_TOKEN na Vercel.'
        : 'Falta o token da brapi. Crie um grátis em brapi.dev e coloque em BRAPI_TOKEN na Vercel.')
    }
    if (res.status === 429) throw new Error('Limite mensal da brapi atingido. Atualize manualmente até o próximo ciclo.')
    if (res.status === 404) throw new Error(`Ticker ${ticker} não encontrado na brapi.`)
    throw new Error(`brapi respondeu ${res.status} para ${ticker}.`)
  }
  const body = (await res.json()) as {
    results?: { symbol: string; regularMarketPrice?: number; regularMarketTime?: string; marketCap?: number }[]
  }
  const r = body.results?.[0]
  if (!r || typeof r.regularMarketPrice !== 'number') throw new Error(`Cotação não encontrada para ${ticker}.`)

  const when = r.regularMarketTime ? new Date(r.regularMarketTime) : new Date()
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(Number.isNaN(when.getTime()) ? new Date() : when)

  return {
    ticker: r.symbol,
    price: r.regularMarketPrice,
    date,
    marketCap: typeof r.marketCap === 'number' ? r.marketCap : null,
    source: 'brapi.dev',
  }
}

export const QUOTABLE_CLASSES = ['acao', 'fii', 'etf', 'bdr']
