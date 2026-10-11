import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { applyRateLimit, notFound, serverError } from '@/lib/auth-helpers'
import { buscarPedidoPorToken } from '@/lib/rastreio-publico'
import { COMPROVANTE_DIR, COMPROVANTE_LEGACY_DIR, COMPROVANTE_MIME, type ComprovanteExt, nomeArquivoComprovante } from '@/lib/comprovante-storage'

// GET /api/publico/rastreio/[token]/comprovante - Foto do comprovante, só depois da entrega
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const rateLimit = await applyRateLimit(request, 'polling')
    if (!rateLimit.success) return rateLimit.response
    const pedido = await buscarPedidoPorToken((await params).token)
    if (!pedido || pedido.status !== 'ENTREGUE' || !pedido.fotoComprovante) return notFound('Comprovante não disponível')

    const arquivo = nomeArquivoComprovante(pedido.fotoComprovante)
    if (!arquivo) return notFound('Comprovante não disponível')
    const buffer = await readFile(path.join(arquivo.legacy ? COMPROVANTE_LEGACY_DIR : COMPROVANTE_DIR, arquivo.fileName)).catch(() => null)
    if (!buffer) return notFound('Comprovante não disponível')

    const ext = arquivo.fileName.split('.').pop() as ComprovanteExt
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': COMPROVANTE_MIME[ext],
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (error) {
    console.error('Erro ao servir comprovante público:', error)
    return serverError()
  }
}
