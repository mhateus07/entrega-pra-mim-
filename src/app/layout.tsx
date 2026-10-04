import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Entrega Pra Mim — Entregas urbanas sob demanda',
    template: '%s · Entrega Pra Mim',
  },
  description: 'Coleta e entrega urbana com motoboys verificados, preço calculado por distância e acompanhamento em tempo real.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }, { url: '/icons/icon-192x192.png', type: 'image/png' }],
    apple: [{ url: '/icons/icon-192x192.png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Entrega Pra Mim',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Entrega Pra Mim',
    title: 'Entrega Pra Mim — Entregas urbanas sob demanda',
    description: 'Coleta e entrega urbana com motoboys verificados, preço calculado por distância e acompanhamento em tempo real.',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e0d' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
