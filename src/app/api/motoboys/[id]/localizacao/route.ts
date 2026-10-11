import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMotoboyOwnership, requireAuth, requirePedidoAccess, applyRateLimit, notFound, badRequest, forbidden, serverError } from '@/lib/auth-helpers'

const STATUS_COM_RASTREAMENTO = ['ACEITO', 'EM_COLETA', 'EM_ENTREGA'] as const

// POST /api/motoboys/[id]/localizacao - Atualizar localização (apenas o próprio motoboy)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se é o próprio motoboy (não permite admin atualizar localização de outro)
    const auth = await requireMotoboyOwnership(id)
    if (!auth.authenticated) return auth.response

    const rateLimit = await applyRateLimit(request, 'localizacao', auth.user.id)
    if (!rateLimit.success) return rateLimit.response

    const body = await request.json().catch(() => null)
    const { latitude, longitude } = body ?? {}

    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return badRequest('Latitude e longitude são obrigatórios')
    }

    const atualizado = await prisma.motoboy.updateMany({
      where: { id, aprovacao: 'APROVADO' },
      data: {
        latitudeAtual: latitude,
        longitudeAtual: longitude,
        ultimaAtividade: new Date(),
      },
    })
    if (atualizado.count !== 1) return forbidden('Cadastro de motoboy não aprovado')

    return jsonResponse({
      success: true,
      data: { id, latitude, longitude, ultimaAtividade: new Date() },
    })
  } catch (error) {
    console.error('Erro ao atualizar localização:', error)
    return serverError('Erro ao atualizar localização')
  }
}

// GET /api/motoboys/[id]/localizacao - Obter localização
// Permitido ao próprio motoboy, ao admin e ao cliente com entrega em andamento
// com este motoboy. Qualquer outro usuário logado recebe 403.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response

    const rateLimit = await applyRateLimit(request, 'polling', auth.user.id)
    if (!rateLimit.success) return rateLimit.response

    const { user } = auth
    if (user.role !== 'ADMIN' && user.motoboyId !== id) {
      const pedido = user.role === 'CLIENTE' && user.clienteId
        ? await prisma.pedido.findFirst({
          where: { motoboyId: id, clienteId: user.clienteId, status: { in: [...STATUS_COM_RASTREAMENTO] } },
          select: { clienteId: true, motoboyId: true },
        })
        : null
      if (!pedido) return forbidden('Você não tem permissão para ver esta localização')
      const acesso = await requirePedidoAccess(pedido)
      if (!acesso.authenticated) return acesso.response
    }

    const motoboy = await prisma.motoboy.findUnique({
      where: { id },
      select: {
        id: true,
        latitudeAtual: true,
        longitudeAtual: true,
        ultimaAtividade: true,
        status: true,
        user: {
          select: {
            nome: true,
          },
        },
      },
    })

    if (!motoboy) {
      return notFound('Motoboy não encontrado')
    }

    return jsonResponse({
      success: true,
      data: motoboy,
    })
  } catch (error) {
    console.error('Erro ao obter localização:', error)
    return serverError('Erro ao obter localização')
  }
}
