import { NextRequest, NextResponse } from 'next/server'
import { marcaPublica } from '@/lib/marca'

const ICONES_EPM = [72, 96, 128, 144, 152, 192, 384, 512].map((t) => ({
  src: `/icons/icon-${t}x${t}.png`, sizes: `${t}x${t}`, type: 'image/png', purpose: 'any',
}))

// GET /o/[slug]/manifest.webmanifest - PWA com o nome, a cor e o logo da central
// (marca própria). Nos outros planos, nome da central com a identidade do EPM.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const marca = await marcaPublica((await params).slug)
  if (!marca) return NextResponse.json({ error: 'Central não encontrada' }, { status: 404 })
  const cor = marca.corPrimaria ?? '#f6f5f1'
  const manifest = {
    id: `/o/${marca.slug}`,
    name: marca.marcaPropria ? marca.nome : `${marca.nome} · Entrega Pra Mim`,
    short_name: marca.nome.slice(0, 12),
    start_url: `/o/${marca.slug}/login`,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f6f5f1',
    theme_color: cor,
    icons: marca.logoUrl ? [{ src: marca.logoUrl, sizes: 'any', type: 'image/png', purpose: 'any' }, ...ICONES_EPM] : ICONES_EPM,
  }
  return new NextResponse(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=300' },
  })
}
