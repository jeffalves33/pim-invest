import type { Metadata, Viewport } from 'next'
import './globals.css'
import SWRegister from '@/components/SWRegister'

export const metadata: Metadata = {
  title: { default: 'PIM', template: '%s · PIM' },
  description: 'Personal Investment Management — teses, valuation e carteira',
  applicationName: 'PIM',
  appleWebApp: { capable: true, title: 'PIM', statusBarStyle: 'default' },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0d0f' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <SWRegister />
      </body>
    </html>
  )
}
