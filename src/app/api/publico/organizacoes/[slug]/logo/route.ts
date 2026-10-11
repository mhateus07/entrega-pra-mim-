import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import prisma from '@/lib/prisma'
import { notFound, serverError } from '@/lib/auth-helpers'
import { COMPROVANTE_MIME, type ComprovanteExt } from '@/lib/comprovante-storage'
import { LOGO_DIR, marcaPermitida, nomeArquivoLogoSeguro } from '@/lib/marca'

// GET /api/publico/organizacoes/[slug]/logo - Logo da central (só no plano Marca própria)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: (await params).slug },
      select: { plano: true, status: true, settings: { select: { logoArquivo: true } } },
    })
    const nome = org && org.status !== 'SUSPENSA' && marcaPermitida(org.plano) ? nomeArquivoLogoSeguro(org.settings?.logoArquivo) : null
    if (!nome) return notFound('Logo não encontrado')
    const buffer = await readFile(path.join(LOGO_DIR, nome)).catch(() => null)
    if (!buffer) return notFound('Logo não encontrado')
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': COMPROVANTE_MIME[nome.split('.').pop() as ComprovanteExt],
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
      },
    })
  } catch (error) {
    console.error('Erro ao servir logo:', error)
    return serverError()
  }
}
