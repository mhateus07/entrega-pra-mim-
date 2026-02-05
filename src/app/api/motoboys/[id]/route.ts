import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { updateMotoboySchema, updateDisponibilidadeSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { requireMotoboyOwnership, requireAdmin, notFound, serverError } from '@/lib/auth-helpers'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/motoboys/[id] - Buscar motoboy por ID (owner ou admin)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verificar se é o dono ou admin
    const auth = await requireMotoboyOwnership(id)
    if (!auth.authenticated) return auth.response

    const motoboy = await prisma.motoboy.findUnique({
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
        disponibilidades: true,
        pedidos: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            cliente: {
              include: {
                user: {
                  select: { nome: true },
                },
              },
            },
          },
        },
        avaliacoes: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!motoboy) {
      return notFound('Motoboy não encontrado')
    }

    const response: ApiResponse<typeof motoboy> = {
      success: true,
      data: motoboy,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao buscar motoboy:', error)
    return serverError('Erro ao buscar motoboy')
  }
}

// PATCH /api/motoboys/[id] - Atualizar motoboy (owner ou admin)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verificar se é o dono ou admin
    const auth = await requireMotoboyOwnership(id)
    if (!auth.authenticated) return auth.response

    const body = await request.json()

    // Verificar se motoboy existe
    const motoboy = await prisma.motoboy.findUnique({
      where: { id },
    })

    if (!motoboy) {
      return notFound('Motoboy não encontrado')
    }

    // Verificar se está atualizando disponibilidades
    if (body.disponibilidades) {
      const validationDisp = updateDisponibilidadeSchema.safeParse(body.disponibilidades)
      if (!validationDisp.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Dados de disponibilidade inválidos',
            details: validationDisp.error.issues,
          },
          { status: 400 }
        )
      }

      // Atualizar disponibilidades em transação
      await prisma.// eslint-disable-next-line @typescript-eslint/no-explicit-any
$transaction(async (tx: any) => {
        // Deletar disponibilidades existentes
        await tx.disponibilidade.deleteMany({
          where: { motoboyId: id },
        })

        // Criar novas disponibilidades
        for (const disp of validationDisp.data) {
          await tx.disponibilidade.create({
            data: {
              motoboyId: id,
              ...disp,
            },
          })
        }
      })

      const updated = await prisma.motoboy.findUnique({
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
          disponibilidades: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Disponibilidades atualizadas com sucesso',
      })
    }

    // Validar dados de atualização do motoboy
    const validation = updateMotoboySchema.safeParse(body)
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

    // Se está atualizando a placa, verificar se não existe
    if (data.veiculoPlaca) {
      const existingPlaca = await prisma.motoboy.findFirst({
        where: {
          veiculoPlaca: data.veiculoPlaca.toUpperCase(),
          NOT: { id },
        },
      })

      if (existingPlaca) {
        return NextResponse.json(
          { success: false, error: 'Placa já cadastrada' },
          { status: 400 }
        )
      }
    }

    // Atualizar motoboy e usuário
    const updateData: Record<string, unknown> = {}
    const updateUserData: Record<string, unknown> = {}

    if (data.veiculoTipo) updateData.veiculoTipo = data.veiculoTipo
    if (data.veiculoMarca) updateData.veiculoMarca = data.veiculoMarca
    if (data.veiculoModelo) updateData.veiculoModelo = data.veiculoModelo
    if (data.veiculoPlaca) updateData.veiculoPlaca = data.veiculoPlaca.toUpperCase()
    if (data.status) updateData.status = data.status
    if (data.latitudeAtual !== undefined) updateData.latitudeAtual = data.latitudeAtual
    if (data.longitudeAtual !== undefined) updateData.longitudeAtual = data.longitudeAtual

    if (data.nome) updateUserData.nome = data.nome
    if (data.telefone) updateUserData.telefone = data.telefone

    // Atualizar última atividade se estiver mudando status para disponível
    if (data.status === 'DISPONIVEL') {
      updateData.ultimaAtividade = new Date()
    }

    const result = await prisma.// eslint-disable-next-line @typescript-eslint/no-explicit-any
$transaction(async (tx: any) => {
      if (Object.keys(updateUserData).length > 0) {
        await tx.user.update({
          where: { id: motoboy.userId },
          data: updateUserData,
        })
      }

      return tx.motoboy.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
              telefone: true,
            },
          },
          disponibilidades: true,
        },
      })
    })

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Motoboy atualizado com sucesso',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao atualizar motoboy:', error)
    return serverError('Erro ao atualizar motoboy')
  }
}

// DELETE /api/motoboys/[id] - Deletar motoboy (apenas admin)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Apenas admin pode deletar motoboys
    const auth = await requireAdmin()
    if (!auth.authenticated) return auth.response

    const motoboy = await prisma.motoboy.findUnique({
      where: { id },
    })

    if (!motoboy) {
      return notFound('Motoboy não encontrado')
    }

    // Deletar em cascata (usuário -> motoboy -> disponibilidades)
    await prisma.user.delete({
      where: { id: motoboy.userId },
    })

    return NextResponse.json({
      success: true,
      message: 'Motoboy deletado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao deletar motoboy:', error)
    return serverError('Erro ao deletar motoboy')
  }
}
