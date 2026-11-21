import { parseBRDate, parseBRNumber } from './ficha-parser'

export type FormState = { error?: string; ok?: boolean; message?: string } | undefined

export const str = (fd: FormData, k: string): string | null => {
  const v = fd.get(k)
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

export const num = (fd: FormData, k: string): number | null => parseBRNumber(str(fd, k))

/** Aceita "2026-11-17" (input date) ou "17/11/2026". */
export const date = (fd: FormData, k: string): string | null => parseBRDate(str(fd, k))

export const bool = (fd: FormData, k: string): boolean => {
  const v = fd.get(k)
  return v === 'on' || v === 'true' || v === '1'
}

export function dbError(e: { code?: string; message: string } | null | undefined, fallback = 'Não foi possível salvar.') {
  if (!e) return fallback
  if (e.code === '23505') return 'Já existe um registro com esses dados (ticker ou versão repetidos).'
  if (e.code === '23514') return `Valor inválido: ${e.message}`
  return e.message || fallback
}
