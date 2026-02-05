import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createPedidoSchema } from '@/lib/validations'
import { calcularRota } from '@/lib/google-maps'
import { calcularPrecoCompleto, estimarTempo } from '@/lib/pricing'
import { encontrarMelhorMotoboy } from '@/lib/alocacao'
import { ApiResponse } from '@/types'
import { requireAuth, requireClienteOwnership, serverError, forbidden } from '@/lib/auth-helpers'

// GET /api/pedidos - Listar pedidos (filtrado por papel do usuário)
export async function GET(request: NextRequest) {
  try {
    // Requer autenticação
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const tipoServico = searchParams.get('tipoServico')
    const clienteId = searchParams.get('clienteId')
    const motoboyId = searchParams.get('motoboyId')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    const where: Record<string, unknown> = {}

    // Filtrar por papel do usuário (segurança)
    if (auth.user.role === 'CLIENTE') {
      // Cliente só vê seus próprios pedidos
      where.clienteId = auth.user.clienteId
    } else if (auth.user.role === 'MOTOBOY') {
      // Motoboy vê pedidos disponíveis (SOLICITADO) ou atribuídos a ele
      where.OR = [
        { status: 'SOLICITADO' },
        { motoboyId: auth.user.motoboyId },
      ]
    }
    // Admin vê todos os pedidos

    if (status) where.status = status
    if (tipoServico) where.tipoServico = tipoServico

    // Clientes não podem filtrar por outros clienteIds
    if (clienteId && auth.user.role === 'ADMIN') {
      where.clienteId = clienteId
    }
    if (motoboyId && auth.user.role === 'ADMIN') {
      where.motoboyId = motoboyId
    }

    if (dataInicio || dataFim) {
      where.createdAt = {}
      if (dataInicio) (where.createdAt as Record<string, unknown>).gte = new Date(dataInicio)
      if (dataFim) (where.createdAt as Record<string, unknown>).lte = new Date(dataFim)
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        cliente: {
          include: {
            user: {
              select: { nome: true, telefone: true },
            },
          },
        },
        motoboy: {
          include: {
            user: {
              select: { nome: true, telefone: true },
            },
          },
        },
        enderecoOrigem: true,
        enderecoDestino: true,
        avaliacao: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const response: ApiResponse<typeof pedidos> = {
      success: true,
      data: pedidos,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao listar pedidos:', error)
    return serverError('Erro ao listar pedidos')
  }
}

// POST /api/pedidos - Criar pedido (cliente autenticado)
export async function POST(request: NextRequest) {
  try {
    // Requer autenticação
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response

    const body = await request.json()

    const validation = createPedidoSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validation.error.issues,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Cliente só pode criar pedido para si mesmo
    if (auth.user.role === 'CLIENTE' && auth.user.clienteId !== data.clienteId) {
      return forbidden('Você só pode criar pedidos para sua própria conta')
    }

    // Verificar se cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: data.clienteId },
    })

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Buscar endereços
    const [enderecoOrigem, enderecoDestino] = await Promise.all([
      prisma.endereco.findUnique({ where: { id: data.enderecoOrigemId } }),
      prisma.endereco.findUnique({ where: { id: data.enderecoDestinoId } }),
    ])

    if (!enderecoOrigem) {
      return NextResponse.json(
        { success: false, error: 'Endereço de origem não encontrado' },
        { status: 404 }
      )
    }

    if (!enderecoDestino) {
      return NextResponse.json(
        { success: false, error: 'Endereço de destino não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se endereços têm coordenadas
    if (
      !enderecoOrigem.latitude ||
      !enderecoOrigem.longitude ||
      !enderecoDestino.latitude ||
      !enderecoDestino.longitude
    ) {
      return NextResponse.json(
        { success: false, error: 'Endereços não possuem coordenadas válidas' },
        { status: 400 }
      )
    }

    // Calcular rota
    const rota = await calcularRota(
      { latitude: enderecoOrigem.latitude, longitude: enderecoOrigem.longitude },
      { latitude: enderecoDestino.latitude, longitude: enderecoDestino.longitude }
    )

    let distanciaKm: number
    let duracaoMinutos: number

    if (rota) {
      distanciaKm = rota.distanciaKm
      duracaoMinutos = rota.duracaoMinutos
    } else {
      // Fallback: cálculo simples
      const dx = enderecoDestino.latitude - enderecoOrigem.latitude
      const dy = enderecoDestino.longitude - enderecoOrigem.longitude
      distanciaKm = Math.sqrt(dx * dx + dy * dy) * 111 // ~111km por grau
      duracaoMinutos = estimarTempo(distanciaKm)
    }

    // Calcular preço
    const preco = calcularPrecoCompleto(distanciaKm, duracaoMinutos, data.tipoServico)

    // Criar pedido
    const pedido = await prisma.pedido.create({
      data: {
        clienteId: data.clienteId,
        enderecoOrigemId: data.enderecoOrigemId,
        enderecoDestinoId: data.enderecoDestinoId,
        tipoServico: data.tipoServico,
        descricaoItem: data.descricaoItem,
        observacoes: data.observacoes,
        pesoAproximado: data.pesoAproximado,
        dataAgendada: data.dataAgendada ? new Date(data.dataAgendada) : null,
        distanciaKm: preco.distanciaKm,
        duracaoEstimada: preco.tempoEstimado,
        valorBase: preco.valorBase,
        multiplicador: preco.multiplicador,
        valorTotal: preco.valorTotal,
        status: 'SOLICITADO',
      },
      include: {
        cliente: {
          include: {
            user: {
              select: { nome: true, telefone: true },
            },
          },
        },
        enderecoOrigem: true,
        enderecoDestino: true,
      },
    })

    // Para entregas expressas, tentar alocar motoboy automaticamente
    if (data.tipoServico === 'EXPRESSA') {
      const motoboys = await prisma.motoboy.findMany({
        where: { status: 'DISPONIVEL' },
        include: { disponibilidades: true },
      })

      const melhorMotoboy = encontrarMelhorMotoboy(motoboys, {
        latitude: enderecoOrigem.latitude,
        longitude: enderecoOrigem.longitude,
      })

      if (melhorMotoboy) {
        // Notificar motoboy (aqui seria via push notification/websocket)
        // Por enquanto, apenas retornar a sugestão no response
        const response: ApiResponse<typeof pedido & { motoboyRecomendado?: string }> = {
          success: true,
          data: { ...pedido, motoboyRecomendado: melhorMotoboy.motoboyId },
          message: 'Pedido criado com sucesso. Motoboy será notificado.',
        }
        return NextResponse.json(response, { status: 201 })
      }
    }

    const response: ApiResponse<typeof pedido> = {
      success: true,
      data: pedido,
      message: 'Pedido criado com sucesso',
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return serverError('Erro ao criar pedido')
  }
}
