import type { Metadata, Viewport } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { TransicaoArea } from '@/components/layout/Transicao'

const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'https://entregapramim.impulsiodigital.com'),
  title: {
    default: 'Entrega Pra Mim — Sistema para centrais de motofrete',
    template: '%s · Entrega Pra Mim',
  },
  description: 'Sua central de motofrete despachando, rastreando e fechando o dia num sistema só, com a sua marca e preço fixo. Sem comissão por corrida.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon-180x180.png', sizes: '180x180' }],
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
    title: 'Entrega Pra Mim — Despacha. Rastreia. Fecha o dia.',
    description: 'Sua central de motofrete despachando, rastreando e fechando o dia num sistema só, com a sua marca e preço fixo. Sem comissão por corrida.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Entrega Pra Mim' }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f5f1' },
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
      <body className={`${archivo.variable} ${plexMono.variable} font-sans antialiased`}>
        <Providers><TransicaoArea>{children}</TransicaoArea></Providers>
      </body>
    </html>
  )
}
