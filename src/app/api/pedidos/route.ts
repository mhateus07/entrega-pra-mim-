import { parsePagination, paginationMeta, enumFilter } from '@/lib/pagination'
import { OperacaoError } from '@/lib/operacao-error'
import { Prisma } from '@prisma/client'
import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { createPedidoSchema } from '@/lib/validations'
import { calcularRota } from '@/lib/google-maps'
import { calcularPrecoComRegra, estimarTempo } from '@/lib/pricing'
import { carregarRegraPreco } from '@/lib/pricing-org'
import { registrarEntrega } from '@/lib/uso'
import { gerarToken } from '@/lib/tokens'
import { ofertarPedido } from '@/lib/despacho'
import { ApiResponse } from '@/types'
import { requireOrgAccess, serverError, forbidden, applyMapsRateLimit, isGestor, type OrgUser } from '@/lib/auth-helpers'
import { comIdempotencia } from '@/lib/idempotency'
import { clientePedidoSelect } from '@/lib/pedido-select'
import { registrarAuditoria } from '@/lib/audit'

// GET /api/pedidos - Listar pedidos (filtrado por papel do usuário)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireOrgAccess()
    if (!auth.authenticated) return auth.response

    const searchParams = request.nextUrl.searchParams
    const paging = parsePagination(searchParams)
    const status = enumFilter(searchParams.get('status'), ['SOLICITADO', 'ACEITO', 'EM_COLETA', 'EM_ENTREGA', 'ENTREGUE', 'CANCELADO'] as const)
    const tipoServico = enumFilter(searchParams.get('tipoServico'), ['EXPRESSA', 'AGENDADA', 'DOCUMENTOS'] as const)
    const clienteId = searchParams.get('clienteId')
    const motoboyId = searchParams.get('motoboyId')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    // Sempre dentro da central ativa
    const where: Prisma.PedidoWhereInput = { organizationId: auth.user.organizationId }

    // Filtrar por papel do usuário (segurança)
    if (auth.user.orgRole === 'CLIENT') {
      // Cliente só vê seus próprios pedidos
      if (!auth.user.clienteId) return forbidden('Cadastro de cliente não encontrado')
      where.clienteId = auth.user.clienteId
    } else if (auth.user.orgRole === 'DRIVER') {
      if (!auth.user.motoboyId) return forbidden('Cadastro de motoboy não encontrado')
      // Motoboy vê só os pedidos atribuídos a ele; novas corridas chegam como oferta
      // (GET /api/despacho/ofertas), não como lista aberta de pedidos da central
      where.motoboyId = auth.user.motoboyId
    }
    // Gestão da central vê todos os pedidos dela

    const grupo = enumFilter(searchParams.get('grupo'), ['ativos', 'finalizados'] as const)
    if (grupo) where.status = { in: grupo === 'ativos' ? ['SOLICITADO', 'ACEITO', 'EM_COLETA', 'EM_ENTREGA'] : ['ENTREGUE', 'CANCELADO'] }
    if (status) where.status = status
    if (tipoServico) where.tipoServico = tipoServico

    // Clientes não podem filtrar por outros clienteIds
    if (clienteId && isGestor(auth.user)) {
      where.clienteId = clienteId
    }
    if (motoboyId && (isGestor(auth.user) || motoboyId === auth.user.motoboyId)) {
      where.motoboyId = motoboyId
    }

    if (dataInicio || dataFim) {
      where.createdAt = {}
      if (dataInicio) {
        if (Number.isNaN(Date.parse(dataInicio))) throw new OperacaoError('Data inicial inválida', 400)
        where.createdAt.gte = new Date(dataInicio)
      }
      if (dataFim) {
        if (Number.isNaN(Date.parse(dataFim))) throw new OperacaoError('Data final inválida', 400)
        where.createdAt.lte = new Date(dataFim)
      }
    }

    const pedidos = await prisma.pedido.findMany({
      where, skip: paging.skip, take: paging.take,
      include: {
        cliente: { select: clientePedidoSelect },
        motoboy: {
          select: {
            id: true, avaliacaoMedia: true,
            user: {
              select: { nome: true, telefone: true },
            },
          },
        },
        enderecoOrigem: true,
        enderecoDestino: true,
        avaliacao: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })

    const total = await prisma.pedido.count({ where })
    const response = {
      pagination: paginationMeta(paging.page, paging.pageSize, total),
      success: true,
      // Antes do aceite, o motoboy vê endereços para decidir, mas não o telefone do cliente
      data: auth.user.orgRole === 'DRIVER'
        ? pedidos.map(p => p.motoboyId === auth.user.motoboyId ? p : { ...p, cliente: { ...p.cliente, user: { nome: p.cliente.user.nome, telefone: null } } })
        : pedidos,
    }

    return jsonResponse(response)
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao listar pedidos:', error)
    return serverError('Erro ao listar pedidos')
  }
}

// POST /api/pedidos - Criar pedido (cliente autenticado)
// Aceita Idempotency-Key: repetir o envio com a mesma chave não duplica o pedido.
export async function POST(request: NextRequest) {
  try {
    // Requer autenticação
    const auth = await requireOrgAccess(['OWNER', 'DISPATCHER', 'CLIENT'])
    if (!auth.authenticated) return auth.response

    const body = await request.json().catch(() => null)
    return await comIdempotencia(request, auth.user.id, 'pedidos:criar', body,
      () => criarPedido(request, auth.user, body))
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return serverError('Erro ao criar pedido')
  }
}

async function criarPedido(request: NextRequest, user: OrgUser, body: unknown) {
  try {
    const validation = createPedidoSchema.safeParse(body)
    if (!validation.success) {
      return jsonResponse(
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
    if (user.orgRole === 'CLIENT' && user.clienteId !== data.clienteId) {
      return forbidden('Você só pode criar pedidos para sua própria conta')
    }

    // Verificar se cliente existe
    // Cliente precisa ser da central ativa
    const cliente = await prisma.cliente.findFirst({
      where: { id: data.clienteId, organizationId: user.organizationId },
    })

    if (!cliente) {
      return jsonResponse(
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
      return jsonResponse(
        { success: false, error: 'Endereço de origem não encontrado' },
        { status: 404 }
      )
    }

    if (!enderecoDestino) {
      return jsonResponse(
        { success: false, error: 'Endereço de destino não encontrado' },
        { status: 404 }
      )
    }

    if (enderecoOrigem.clienteId !== data.clienteId || enderecoDestino.clienteId !== data.clienteId) {
      return forbidden('Os endereços devem pertencer ao cliente do pedido')
    }

    // Verificar se endereços têm coordenadas
    if (
      enderecoOrigem.latitude == null ||
      enderecoOrigem.longitude == null ||
      enderecoDestino.latitude == null ||
      enderecoDestino.longitude == null
    ) {
      return jsonResponse(
        { success: false, error: 'Endereços não possuem coordenadas válidas' },
        { status: 400 }
      )
    }

    // Calcular rota (consome cota do Google Maps)
    const limite = await applyMapsRateLimit(user.id)
    if (!limite.success) return limite.response
    const rota = await calcularRota(
      { latitude: enderecoOrigem.latitude, longitude: enderecoOrigem.longitude },
      { latitude: enderecoDestino.latitude, longitude: enderecoDestino.longitude },
      { organizationId: user.organizationId }
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

    // Preço pela tabela da central; fica congelado no pedido e nunca é recalculado
    const regra = await carregarRegraPreco(user.organizationId)
    const preco = { ...calcularPrecoComRegra(regra, distanciaKm, data.tipoServico, enderecoDestino.bairro), tempoEstimado: duracaoMinutos }

    // Criar pedido e contar a entrega no mês do plano, na mesma transação
    let avisoPlano: string | null = null
    const pedido = await prisma.$transaction(async (tx) => {
      avisoPlano = await registrarEntrega(tx, user.organizationId)
      return tx.pedido.create({
      data: {
        organizationId: user.organizationId,
        trackingToken: gerarToken(),
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
        cliente: { select: clientePedidoSelect },
        enderecoOrigem: true,
        enderecoDestino: true,
      },
      })
    })

    await registrarAuditoria({
      acao: 'pedido.criado', entidade: 'Pedido', entidadeId: pedido.id, userId: user.id, organizationId: user.organizationId, request,
      dados: { tipoServico: pedido.tipoServico, valorTotal: pedido.valorTotal.toString() },
    })

    // Despacho: oferece ao melhor motoboy online (ou manda para a fila manual).
    // Falha aqui não desfaz o pedido; o job de despacho tenta de novo.
    const despacho = await ofertarPedido(pedido.id).catch((error) => {
      console.error('Despacho: falha ao ofertar pedido novo', pedido.id, error)
      return null
    })

    const response: ApiResponse<typeof pedido> = {
      success: true,
      data: pedido,
      message: despacho?.tipo === 'ofertado' ? 'Pedido criado. Procurando o motoboy mais próximo.' : 'Pedido criado com sucesso',
      ...(avisoPlano ? { aviso: avisoPlano } : {}),
    }

    return jsonResponse(response, { status: 201 })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao criar pedido:', error)
    return serverError('Erro ao criar pedido')
  }
}
