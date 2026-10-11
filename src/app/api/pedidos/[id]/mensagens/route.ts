import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { applyRateLimit, requireOrgAccess, requirePedidoAccess, notFound, forbidden, badRequest, serverError } from '@/lib/auth-helpers'

interface RouteParams {
  params: Promise<{ id: string }>
}

const mensagemSchema = z.object({
  conteudo: z.string().min(1, 'Mensagem não pode estar vazia').max(1000),
})

// Pedido da central ativa, com a checagem de acesso padrão (gestão, cliente dono, motoboy atribuído)
async function pedidoDaOrg(id: string, organizationId: string) {
  const pedido = await prisma.pedido.findFirst({
    where: { id, organizationId },
    select: { id: true, organizationId: true, clienteId: true, motoboyId: true, status: true },
  })
  if (!pedido) return { erro: notFound('Pedido não encontrado') } as const
  const acesso = await requirePedidoAccess(pedido)
  if (!acesso.authenticated) return { erro: acesso.response } as const
  return { pedido, user: acesso.user } as const
}

// GET /api/pedidos/[id]/mensagens - Listar mensagens do pedido
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireOrgAccess()
    if (!auth.authenticated) return auth.response

    const rateLimit = await applyRateLimit(request, 'polling', auth.user.id)
    if (!rateLimit.success) return rateLimit.response

    const { id } = await params
    const resultado = await pedidoDaOrg(id, auth.user.organizationId)
    if ('erro' in resultado) return resultado.erro
    const { user } = resultado

    const mensagens = await prisma.mensagem.findMany({
      where: { pedidoId: id, organizationId: user.organizationId },
      orderBy: { createdAt: 'asc' },
    })

    // Só os participantes marcam como lidas as mensagens do outro lado
    if (user.orgRole === 'CLIENT' || user.orgRole === 'DRIVER') {
      await prisma.mensagem.updateMany({
        where: {
          pedidoId: id,
          organizationId: user.organizationId,
          remetente: user.orgRole === 'CLIENT' ? 'MOTOBOY' : 'CLIENTE',
          lida: false,
        },
        data: { lida: true },
      })
    }

    return jsonResponse({
      success: true,
      data: mensagens,
    })
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error)
    return serverError()
  }
}

// POST /api/pedidos/[id]/mensagens - Enviar mensagem (cliente do pedido ou motoboy atribuído)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireOrgAccess(['CLIENT', 'DRIVER'])
    if (!auth.authenticated) return auth.response

    const rateLimit = await applyRateLimit(request, 'chat', auth.user.id)
    if (!rateLimit.success) return rateLimit.response

    const { id } = await params
    const body = await request.json().catch(() => null)

    const validation = mensagemSchema.safeParse(body)
    if (!validation.success) {
      return jsonResponse(
        { success: false, error: 'Mensagem inválida', details: validation.error.issues },
        { status: 400 }
      )
    }

    const resultado = await pedidoDaOrg(id, auth.user.organizationId)
    if ('erro' in resultado) return resultado.erro
    const { pedido, user } = resultado
    if (user.orgRole !== 'CLIENT' && user.orgRole !== 'DRIVER') return forbidden('Acesso negado')

    // Verificar se o pedido está em andamento
    if (['ENTREGUE', 'CANCELADO', 'SOLICITADO'].includes(pedido.status)) {
      return badRequest('Chat não disponível para este pedido')
    }

    const mensagem = await prisma.mensagem.create({
      data: {
        organizationId: user.organizationId,
        pedidoId: id,
        remetente: user.orgRole === 'CLIENT' ? 'CLIENTE' : 'MOTOBOY',
        conteudo: validation.data.conteudo,
      },
    })

    return jsonResponse({
      success: true,
      data: mensagem,
    })
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return serverError()
  }
}
