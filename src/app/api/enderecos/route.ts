import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createEnderecoSchema } from '@/lib/validations'
import { geocodificarEndereco } from '@/lib/google-maps'
import { ApiResponse } from '@/types'
import { requireClienteOwnership, badRequest, notFound, serverError, forbidden } from '@/lib/auth-helpers'

// GET /api/enderecos - Listar endereços (por cliente, verificação de ownership)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clienteId = searchParams.get('clienteId')

    if (!clienteId) {
      return badRequest('clienteId é obrigatório')
    }

    // Verificar se é o dono ou admin
    const auth = await requireClienteOwnership(clienteId)
    if (!auth.authenticated) return auth.response

    const enderecos = await prisma.endereco.findMany({
      where: { clienteId },
      orderBy: [{ favorito: 'desc' }, { createdAt: 'desc' }],
    })

    const response: ApiResponse<typeof enderecos> = {
      success: true,
      data: enderecos,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao listar endereços:', error)
    return serverError('Erro ao listar endereços')
  }
}

// POST /api/enderecos - Criar endereço (verificação de ownership)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = createEnderecoSchema.safeParse(body)
    if (!validation.success) {
      return badRequest('Dados inválidos')
    }

    const data = validation.data

    // Verificar se é o dono ou admin
    const auth = await requireClienteOwnership(data.clienteId)
    if (!auth.authenticated) return auth.response

    // Verificar se cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: data.clienteId },
    })

    if (!cliente) {
      return notFound('Cliente não encontrado')
    }

    // Geocodificar endereço se não tiver coordenadas
    let latitude = data.latitude
    let longitude = data.longitude

    if (!latitude || !longitude) {
      const geocode = await geocodificarEndereco({
        logradouro: data.logradouro,
        numero: data.numero,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
        cep: data.cep,
      })

      if (geocode) {
        latitude = geocode.latitude
        longitude = geocode.longitude
      }
    }

    // Se o novo endereço for favorito, remover favorito dos outros
    if (data.favorito) {
      await prisma.endereco.updateMany({
        where: { clienteId: data.clienteId, favorito: true },
        data: { favorito: false },
      })
    }

    const endereco = await prisma.endereco.create({
      data: {
        ...data,
        latitude,
        longitude,
      },
    })

    const response: ApiResponse<typeof endereco> = {
      success: true,
      data: endereco,
      message: 'Endereço cadastrado com sucesso',
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar endereço:', error)
    return serverError('Erro ao criar endereço')
  }
}
