import { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireGestor, badRequest, serverError } from '@/lib/auth-helpers'
import { reofertarPedido } from '@/lib/despacho'
import { OperacaoError } from '@/lib/operacao-error'

// GET /api/despacho/fila - Pedidos aguardando motoboy: ofertas em andamento e fila manual
export async function GET() {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response
    const organizationId = auth.user.organizationId

    const [pedidos, disponiveis] = await Promise.all([
      prisma.pedido.findMany({
        where: { organizationId, status: 'SOLICITADO', motoboyId: null },
        orderBy: [{ despachoManual: 'desc' }, { createdAt: 'asc' }],
        take: 100,
        select: {
          id: true, createdAt: true, tipoServico: true, dataAgendada: true, valorTotal: true, despachoManual: true, tentativasDespacho: true,
          cliente: { select: { razaoSocial: true, user: { select: { nome: true } } } },
          enderecoOrigem: { select: { bairro: true } },
          enderecoDestino: { select: { bairro: true } },
          ofertas: {
            where: { status: 'OFERTADA' }, take: 1,
            select: { id: true, expiresAt: true, tentativa: true, motoboy: { select: { user: { select: { nome: true } } } } },
          },
        },
      }),
      prisma.motoboy.findMany({
        where: { organizationId, status: 'DISPONIVEL', aprovacao: 'APROVADO' },
        select: { id: true, user: { select: { nome: true } } },
        orderBy: { ultimaAtividade: 'asc' },
      }),
    ])

    return jsonResponse({
      success: true,
      data: {
        manual: pedidos.filter(p => p.despachoManual),
        emOferta: pedidos.filter(p => !p.despachoManual),
        motoboysDisponiveis: disponiveis.map(m => ({ id: m.id, nome: m.user.nome })),
      },
    })
  } catch (error) {
    console.error('Erro ao listar fila de despacho:', error)
    return serverError()
  }
}

const reofertarSchema = z.object({ pedidoId: z.string().min(1) })

// POST /api/despacho/fila - Devolve um pedido da fila manual ao despacho automático
export async function POST(request: NextRequest) {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response
    const validation = reofertarSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return badRequest('Informe o pedido')
    const resultado = await reofertarPedido(validation.data.pedidoId, auth.user.organizationId)
    return jsonResponse({ success: true, data: resultado })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao reofertar pedido:', error)
    return serverError()
  }
}
