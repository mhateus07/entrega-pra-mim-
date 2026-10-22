import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { updateMotoboySchema, updateDisponibilidadeSchema } from '@/lib/validations'
import { ApiResponse } from '@/types'
import { OperacaoError } from '@/lib/operacao-error'
import { requireMotoboyOwnership, requireOwner, notFound, serverError, forbidden } from '@/lib/auth-helpers'
import { registrarAuditoria } from '@/lib/audit'

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
            cliente: { select: { id: true, user: { select: { nome: true } } } },
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

    return jsonResponse(response)
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
        return jsonResponse(
          {
            success: false,
            error: 'Dados de disponibilidade inválidos',
            details: validationDisp.error.issues,
          },
          { status: 400 }
        )
      }

      // Atualizar disponibilidades em transação
      await prisma.$transaction(async (tx) => {
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

      return jsonResponse({
        success: true,
        data: updated,
        message: 'Disponibilidades atualizadas com sucesso',
      })
    }

    // Validar dados de atualização do motoboy
    const validation = updateMotoboySchema.safeParse(body)
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
    if (data.status === 'EM_ENTREGA') {
      return jsonResponse({ success: false, error: 'O status em entrega é definido ao aceitar um pedido' }, { status: 400 })
    }
    if (data.status === 'DISPONIVEL' && motoboy.aprovacao !== 'APROVADO') {
      return forbidden('Seu cadastro ainda não foi aprovado para receber pedidos')
    }

    // Se está atualizando a placa, verificar se não existe
    if (data.veiculoPlaca) {
      const existingPlaca = await prisma.motoboy.findFirst({
        where: {
          organizationId: auth.user.organizationId,
          veiculoPlaca: data.veiculoPlaca.toUpperCase(),
          NOT: { id },
        },
      })

      if (existingPlaca) {
        return jsonResponse(
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
    if (data.latitudeAtual !== undefined) updateData.latitudeAtual = data.latitudeAtual
    if (data.longitudeAtual !== undefined) updateData.longitudeAtual = data.longitudeAtual

    if (data.nome) updateUserData.nome = data.nome
    if (data.telefone) updateUserData.telefone = data.telefone

    // Atualizar última atividade se estiver mudando status para disponível
    if (data.status === 'DISPONIVEL') {
      updateData.ultimaAtividade = new Date()
      updateData.disponivelDesde = new Date()
    }

    const result = await prisma.$transaction(async (tx) => {
      if (data.status) {
        const changed = await tx.motoboy.updateMany({
          where: { id, status: { not: 'EM_ENTREGA' } }, data: { status: data.status },
        })
        if (changed.count !== 1) throw new OperacaoError('Conclua ou cancele a entrega antes de mudar a disponibilidade')
        const ativo = await tx.pedido.findFirst({
          where: { motoboyId: id, status: { in: ['ACEITO', 'EM_COLETA', 'EM_ENTREGA'] } },
        })
        if (ativo) throw new OperacaoError('Motoboy possui entrega em andamento')
      }
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

    return jsonResponse(response)
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao atualizar motoboy:', error)
    return serverError('Erro ao atualizar motoboy')
  }
}

// DELETE /api/motoboys/[id] - Remover motoboy da central (apenas o dono)
// Remove o perfil e o vínculo nesta central. A conta do usuário só é apagada
// se ele não pertencer a nenhuma outra central.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const auth = await requireOwner()
    if (!auth.authenticated) return auth.response

    const motoboy = await prisma.motoboy.findFirst({
      where: { id, organizationId: auth.user.organizationId },
      select: { id: true, userId: true, _count: { select: { pedidos: true } } },
    })

    if (!motoboy) {
      return notFound('Motoboy não encontrado')
    }
    if (motoboy._count.pedidos > 0) {
      return jsonResponse(
        { success: false, error: 'Motoboy com entregas registradas não pode ser removido. Suspenda o cadastro.' },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.motoboy.delete({ where: { id } })
      await tx.organizationMember.deleteMany({ where: { organizationId: auth.user.organizationId, userId: motoboy.userId } })
      const restantes = await tx.organizationMember.count({ where: { userId: motoboy.userId } })
      if (restantes === 0) await tx.user.delete({ where: { id: motoboy.userId } })
    })
    await registrarAuditoria({
      acao: 'motoboy.excluido', entidade: 'Motoboy', entidadeId: id, userId: auth.user.id,
      organizationId: auth.user.organizationId, request,
      dados: { motoboyUserId: motoboy.userId },
    })

    return jsonResponse({
      success: true,
      message: 'Motoboy removido da central',
    })
  } catch (error) {
    console.error('Erro ao deletar motoboy:', error)
    return serverError('Erro ao deletar motoboy')
  }
}
