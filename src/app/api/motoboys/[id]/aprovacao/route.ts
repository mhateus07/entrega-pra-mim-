import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireAdmin, notFound, badRequest, serverError } from '@/lib/auth-helpers'
import { registrarAuditoria } from '@/lib/audit'
import { OperacaoError } from '@/lib/operacao-error'

const aprovacaoSchema = z.object({
  aprovacao: z.enum(['APROVADO', 'REPROVADO', 'SUSPENSO']),
  motivo: z.string().trim().max(191).optional(),
}).refine(d => d.aprovacao === 'APROVADO' || !!d.motivo, {
  message: 'Informe o motivo da reprovação ou suspensão', path: ['motivo'],
})

// PATCH /api/motoboys/[id]/aprovacao - Aprovar, reprovar ou suspender cadastro (apenas admin)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin()
    if (!auth.authenticated) return auth.response

    const validation = aprovacaoSchema.safeParse(await request.json().catch(() => null))
    if (!validation.success) return badRequest(validation.error.issues[0]?.message ?? 'Dados inválidos')
    const { aprovacao, motivo } = validation.data
    const { id } = await params

    const motoboy = await prisma.motoboy.findUnique({ where: { id }, select: { aprovacao: true } })
    if (!motoboy) return notFound('Motoboy não encontrado')

    const updated = await prisma.$transaction(async tx => {
      if (aprovacao !== 'APROVADO') {
        // Sai de circulação na hora; quem está com entrega ativa precisa concluí-la antes
        const ativo = await tx.pedido.findFirst({
          where: { motoboyId: id, status: { in: ['ACEITO', 'EM_COLETA', 'EM_ENTREGA'] } },
          select: { id: true },
        })
        if (ativo) throw new OperacaoError('Motoboy possui entrega em andamento; conclua ou cancele antes', 409)
      }
      return tx.motoboy.update({
        where: { id },
        data: {
          aprovacao,
          aprovacaoEm: new Date(),
          motivoAprovacao: aprovacao === 'APROVADO' ? null : motivo,
          ...(aprovacao !== 'APROVADO' ? { status: 'OFFLINE' as const } : {}),
        },
        select: { id: true, aprovacao: true, aprovacaoEm: true, motivoAprovacao: true, status: true },
      })
    })

    await registrarAuditoria({
      acao: 'motoboy.aprovacao', entidade: 'Motoboy', entidadeId: id, userId: auth.user.id, request,
      dados: { de: motoboy.aprovacao, para: aprovacao, ...(motivo ? { motivo } : {}) },
    })

    return jsonResponse({ success: true, data: updated, message: 'Cadastro atualizado' })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao atualizar aprovação do motoboy:', error)
    return serverError('Erro ao atualizar aprovação')
  }
}
