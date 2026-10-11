import type { Metadata } from 'next'
import RastreioPublico from './RastreioPublico'

// Página pública de rastreio: o destinatário acompanha a entrega sem login
export const metadata: Metadata = {
  title: 'Acompanhe sua entrega',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <RastreioPublico token={token} />
}
