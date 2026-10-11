import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { updateClienteSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { requireClienteOwnership, notFound, serverError, requireOwner } from '@/lib/auth-helpers'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/clientes/[id] - Buscar cliente por ID (owner ou admin)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verificar se é o dono ou admin
    const auth = await requireClienteOwnership(id)
    if (!auth.authenticated) return auth.response

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
        enderecos: {
          orderBy: [{ favorito: 'desc' }, { createdAt: 'desc' }],
        },
        pedidos: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            motoboy: {
              include: {
                user: {
                  select: { nome: true },
                },
              },
            },
          },
        },
      },
    })

    if (!cliente) {
      return notFound('Cliente não encontrado')
    }

    const response: ApiResponse<typeof cliente> = {
      success: true,
      data: cliente,
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return serverError('Erro ao buscar cliente')
  }
}

// PATCH /api/clientes/[id] - Atualizar cliente (owner ou admin)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verificar se é o dono ou admin
    const auth = await requireClienteOwnership(id)
    if (!auth.authenticated) return auth.response

    const body = await request.json()

    const validation = updateClienteSchema.safeParse(body)
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

    // Verificar se cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id },
    })

    if (!cliente) {
      return notFound('Cliente não encontrado')
    }

    // Verificar se CPF/CNPJ já existe (se fornecido e diferente)
    if (data.cpfCnpj && data.cpfCnpj !== cliente.cpfCnpj) {
      const existingDoc = await prisma.cliente.findFirst({
        where: {
          organizationId: auth.user.organizationId,
          cpfCnpj: data.cpfCnpj,
          NOT: { id },
        },
      })

      if (existingDoc) {
        return jsonResponse(
          { success: false, error: 'CPF/CNPJ já cadastrado' },
          { status: 400 }
        )
      }
    }

    // Separar dados do usuário e do cliente
    const updateUserData: Record<string, unknown> = {}
    const updateClienteData: Record<string, unknown> = {}

    if (data.nome) updateUserData.nome = data.nome
    if (data.telefone) updateUserData.telefone = data.telefone
    if (data.cpfCnpj !== undefined) updateClienteData.cpfCnpj = data.cpfCnpj
    if (data.tipoPessoa) updateClienteData.tipoPessoa = data.tipoPessoa
    if (data.razaoSocial !== undefined) updateClienteData.razaoSocial = data.razaoSocial

    const result = await prisma.$transaction(async (tx) => {
      if (Object.keys(updateUserData).length > 0) {
        await tx.user.update({
          where: { id: cliente.userId },
          data: updateUserData,
        })
      }

      return tx.cliente.update({
        where: { id },
        data: updateClienteData,
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
              telefone: true,
            },
          },
          enderecos: true,
        },
      })
    })

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Cliente atualizado com sucesso',
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return serverError('Erro ao atualizar cliente')
  }
}

// DELETE /api/clientes/[id] - Remover cliente da central (apenas o dono)
// Remove o perfil e o vínculo nesta central; a conta só é apagada se o usuário
// não pertencer a nenhuma outra central.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const auth = await requireOwner()
    if (!auth.authenticated) return auth.response

    const cliente = await prisma.cliente.findFirst({
      where: { id, organizationId: auth.user.organizationId },
      select: { id: true, userId: true, _count: { select: { pedidos: true } } },
    })

    if (!cliente) {
      return notFound('Cliente não encontrado')
    }
    if (cliente._count.pedidos > 0) {
      return jsonResponse(
        { success: false, error: 'Cliente com pedidos registrados não pode ser removido' },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.cliente.delete({ where: { id } })
      await tx.organizationMember.deleteMany({ where: { organizationId: auth.user.organizationId, userId: cliente.userId } })
      const restantes = await tx.organizationMember.count({ where: { userId: cliente.userId } })
      if (restantes === 0) await tx.user.delete({ where: { id: cliente.userId } })
    })

    return jsonResponse({
      success: true,
      message: 'Cliente removido da central',
    })
  } catch (error) {
    console.error('Erro ao deletar cliente:', error)
    return serverError('Erro ao deletar cliente')
  }
}
