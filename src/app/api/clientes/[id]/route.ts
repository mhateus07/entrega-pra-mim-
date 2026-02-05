import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { updateClienteSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { requireClienteOwnership, notFound, serverError, requireAdmin } from '@/lib/auth-helpers'

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

    return NextResponse.json(response)
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
          cpfCnpj: data.cpfCnpj,
          NOT: { id },
        },
      })

      if (existingDoc) {
        return NextResponse.json(
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

    const result = await prisma.// eslint-disable-next-line @typescript-eslint/no-explicit-any
$transaction(async (tx: any) => {
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

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return serverError('Erro ao atualizar cliente')
  }
}

// DELETE /api/clientes/[id] - Deletar cliente (apenas admin)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Apenas admin pode deletar clientes
    const auth = await requireAdmin()
    if (!auth.authenticated) return auth.response

    const cliente = await prisma.cliente.findUnique({
      where: { id },
    })

    if (!cliente) {
      return notFound('Cliente não encontrado')
    }

    // Deletar em cascata (usuário -> cliente -> endereços)
    await prisma.user.delete({
      where: { id: cliente.userId },
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente deletado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao deletar cliente:', error)
    return serverError('Erro ao deletar cliente')
  }
}
