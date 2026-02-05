import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { updateEnderecoSchema } from '@/lib/validations'
import { geocodificarEndereco } from '@/lib/google-maps'
import { ApiResponse } from '@/types'
import { requireEnderecoAccess, notFound, badRequest, serverError } from '@/lib/auth-helpers'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/enderecos/[id] - Buscar endereço por ID (verificação de ownership)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const endereco = await prisma.endereco.findUnique({
      where: { id },
      include: {
        cliente: {
          include: {
            user: {
              select: { nome: true },
            },
          },
        },
      },
    })

    if (!endereco) {
      return notFound('Endereço não encontrado')
    }

    // Verificar se é o dono ou admin
    const auth = await requireEnderecoAccess(endereco)
    if (!auth.authenticated) return auth.response

    const response: ApiResponse<typeof endereco> = {
      success: true,
      data: endereco,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao buscar endereço:', error)
    return serverError('Erro ao buscar endereço')
  }
}

// PATCH /api/enderecos/[id] - Atualizar endereço (verificação de ownership)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verificar se endereço existe
    const endereco = await prisma.endereco.findUnique({
      where: { id },
    })

    if (!endereco) {
      return notFound('Endereço não encontrado')
    }

    // Verificar se é o dono ou admin
    const auth = await requireEnderecoAccess(endereco)
    if (!auth.authenticated) return auth.response

    const body = await request.json()

    const validation = updateEnderecoSchema.safeParse(body)
    if (!validation.success) {
      return badRequest('Dados inválidos')
    }

    const data = validation.data

    // Se está atualizando campos de endereço sem coordenadas, geocodificar
    const needsGeocode =
      (data.logradouro || data.numero || data.bairro || data.cidade || data.estado) &&
      !data.latitude &&
      !data.longitude

    let latitude = data.latitude
    let longitude = data.longitude

    if (needsGeocode) {
      const geocode = await geocodificarEndereco({
        logradouro: data.logradouro || endereco.logradouro,
        numero: data.numero || endereco.numero,
        bairro: data.bairro || endereco.bairro,
        cidade: data.cidade || endereco.cidade,
        estado: data.estado || endereco.estado,
        cep: data.cep || endereco.cep,
      })

      if (geocode) {
        latitude = geocode.latitude
        longitude = geocode.longitude
      }
    }

    // Se o endereço for marcado como favorito, remover favorito dos outros
    if (data.favorito === true) {
      await prisma.endereco.updateMany({
        where: {
          clienteId: endereco.clienteId,
          favorito: true,
          NOT: { id },
        },
        data: { favorito: false },
      })
    }

    const updated = await prisma.endereco.update({
      where: { id },
      data: {
        ...data,
        latitude: latitude ?? endereco.latitude,
        longitude: longitude ?? endereco.longitude,
      },
    })

    const response: ApiResponse<typeof updated> = {
      success: true,
      data: updated,
      message: 'Endereço atualizado com sucesso',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao atualizar endereço:', error)
    return serverError('Erro ao atualizar endereço')
  }
}

// DELETE /api/enderecos/[id] - Deletar endereço (verificação de ownership)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const endereco = await prisma.endereco.findUnique({
      where: { id },
    })

    if (!endereco) {
      return notFound('Endereço não encontrado')
    }

    // Verificar se é o dono ou admin
    const auth = await requireEnderecoAccess(endereco)
    if (!auth.authenticated) return auth.response

    // Verificar se existem pedidos usando este endereço
    const pedidosUsando = await prisma.pedido.count({
      where: {
        OR: [{ enderecoOrigemId: id }, { enderecoDestinoId: id }],
      },
    })

    if (pedidosUsando > 0) {
      return badRequest('Não é possível excluir endereço com pedidos vinculados')
    }

    await prisma.endereco.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Endereço deletado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao deletar endereço:', error)
    return serverError('Erro ao deletar endereço')
  }
}
