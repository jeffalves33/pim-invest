'use client'

import { useState } from 'react'
import { Copy, Download } from 'lucide-react'

/** Copia ou baixa a ficha da tese em texto (mesmo formato aceito na importação). */
export default function CopyFicha({ text, filename }: { text: string; filename: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
          } catch {
            setCopied(false)
          }
        }}
      >
        <Copy size={16} /> {copied ? 'Copiada' : 'Copiar ficha'}
      </button>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          a.click()
          URL.revokeObjectURL(url)
        }}
      >
        <Download size={16} /> Baixar .txt
      </button>
    </div>
  )
}
