import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import prisma from '@/lib/prisma'
import { requirePedidoAccess, notFound, serverError } from '@/lib/auth-helpers'
import { registrarAuditoria } from '@/lib/audit'
import {
  COMPROVANTE_DIR,
  COMPROVANTE_LEGACY_DIR,
  COMPROVANTE_MIME,
  ComprovanteExt,
  nomeArquivoComprovante,
} from '@/lib/comprovante-storage'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/pedidos/[id]/comprovante/arquivo - Serve a imagem do comprovante
// apenas para cliente, motoboy do pedido ou admin.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: { clienteId: true, motoboyId: true, fotoComprovante: true },
    })
    if (!pedido) return notFound('Pedido não encontrado')

    const auth = await requirePedidoAccess(pedido)
    if (!auth.authenticated) return auth.response

    // O arquivo vem sempre do banco; o parâmetro ?f= da URL serve só para cache.
    const arquivo = pedido.fotoComprovante && nomeArquivoComprovante(pedido.fotoComprovante)
    if (!arquivo) return notFound('Comprovante não encontrado')

    const dir = arquivo.legacy ? COMPROVANTE_LEGACY_DIR : COMPROVANTE_DIR
    const buffer = await readFile(path.join(dir, arquivo.fileName)).catch(() => null)
    if (!buffer) return notFound('Comprovante não encontrado')

    await registrarAuditoria({
      acao: 'comprovante.acessado', entidade: 'Pedido', entidadeId: id, userId: auth.user.id, request,
    })

    const ext = arquivo.fileName.split('.').pop() as ComprovanteExt
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': COMPROVANTE_MIME[ext],
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
      },
    })
  } catch (error) {
    console.error('Erro ao servir comprovante:', error)
    return serverError('Erro ao buscar comprovante')
  }
}
