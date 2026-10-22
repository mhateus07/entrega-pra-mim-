import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { jsonResponse } from '@/lib/json-response'
import { requireOrgAccess, requirePedidoAccess, isGestor, badRequest, notFound, serverError, applyRateLimit } from '@/lib/auth-helpers'
import { comPedidoBloqueado } from '@/lib/pedido-transaction'
import { reservarMotoboy } from '@/lib/pedido-status'
import { OperacaoError } from '@/lib/operacao-error'

const schema = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('ocorrencia'), tipo: z.enum(['DESTINATARIO_AUSENTE', 'ENDERECO_INCORRETO', 'LOCAL_FECHADO', 'AVARIA', 'SEM_CONTATO', 'OUTRO']), descricao: z.string().trim().min(5).max(1000) }),
  z.object({ acao: z.literal('resolver'), ocorrenciaId: z.string().cuid(), resolucao: z.string().trim().min(5).max(1000) }),
  z.object({ acao: z.literal('reatribuir'), motoboyId: z.string().cuid(), motivo: z.string().trim().min(5).max(400) }),
])
type Context = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const auth = await requireOrgAccess()
    if (!auth.authenticated) return auth.response
    const { id } = await params
    const pedido = await prisma.pedido.findFirst({ where: { id, organizationId: auth.user.organizationId } })
    if (!pedido) return notFound()
    const acesso = await requirePedidoAccess(pedido)
    if (!acesso.authenticated) return acesso.response
    const [eventos, ocorrencias] = await Promise.all([
      prisma.pedidoEvento.findMany({ where: { pedidoId: id, organizationId: auth.user.organizationId }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, descricao: true, createdAt: true } }),
      prisma.ocorrencia.findMany({ where: { pedidoId: id, organizationId: auth.user.organizationId }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, tipo: true, descricao: true, resolucao: true, resolvidaEm: true, createdAt: true } }),
    ])
    return jsonResponse({ success: true, data: { eventos, ocorrencias, podeGerenciar: isGestor(auth.user), destinatarioNome: pedido.destinatarioNome, destinatarioTelefone: pedido.destinatarioTelefone, referenciaCliente: pedido.referenciaCliente } })
  } catch (error) { console.error('Histórico do pedido', error); return serverError() }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const auth = await requireOrgAccess()
    if (!auth.authenticated) return auth.response
    const limite = await applyRateLimit(request, 'sensitive', auth.user.id)
    if (!limite.success) return limite.response
    const body = schema.safeParse(await request.json().catch(() => null))
    if (!body.success) return badRequest(body.error.issues[0]?.message)
    const { id } = await params
    const pedido = await prisma.pedido.findFirst({ where: { id, organizationId: auth.user.organizationId } })
    if (!pedido) return notFound()
    const acesso = await requirePedidoAccess(pedido)
    if (!acesso.authenticated) return acesso.response
    const user = auth.user
    const data = body.data
    if (data.acao !== 'ocorrencia' && !isGestor(user)) throw new OperacaoError('Apenas a gestão pode executar esta ação', 403)
    await comPedidoBloqueado(id, async tx => {
      const atual = await tx.pedido.findUniqueOrThrow({ where: { id } })
      // Reconfere o vínculo após o lock: um entregador removido não registra novas ocorrências.
      if (user.orgRole === 'DRIVER' && atual.motoboyId !== user.motoboyId) throw new OperacaoError('Acesso negado', 403)
      let descricao: string
      if (data.acao === 'ocorrencia') {
        if (['ENTREGUE', 'CANCELADO'].includes(atual.status)) throw new OperacaoError('Este pedido já foi encerrado')
        await tx.ocorrencia.create({ data: { organizationId: user.organizationId, pedidoId: id, autorId: user.id, tipo: data.tipo, descricao: data.descricao } })
        descricao = `Ocorrência registrada: ${data.tipo.replaceAll('_', ' ').toLowerCase()}`
      } else if (data.acao === 'resolver') {
        const resultado = await tx.ocorrencia.updateMany({ where: { id: data.ocorrenciaId, pedidoId: id, organizationId: user.organizationId, resolvidaEm: null }, data: { resolucao: data.resolucao, resolvidaEm: new Date(), resolvidaPorId: user.id } })
        if (resultado.count !== 1) throw new OperacaoError('Ocorrência não encontrada ou já resolvida')
        descricao = `Ocorrência resolvida: ${data.resolucao}`
      } else {
        if (!['ACEITO', 'EM_COLETA'].includes(atual.status)) throw new OperacaoError('Só é possível trocar o entregador antes da retirada do item')
        if (atual.motoboyId === data.motoboyId) throw new OperacaoError('Selecione outro entregador')
        await reservarMotoboy(tx, user.organizationId, data.motoboyId)
        const novo = await tx.motoboy.findUniqueOrThrow({ where: { id: data.motoboyId }, select: { user: { select: { nome: true } } } })
        await tx.pedido.update({ where: { id }, data: { motoboyId: data.motoboyId, status: 'ACEITO', aceitoEm: new Date(), chegadaColetaEm: null } })
        if (atual.motoboyId) await tx.motoboy.update({ where: { id: atual.motoboyId }, data: { status: 'DISPONIVEL', disponivelDesde: new Date() } })
        descricao = `Reatribuído a ${novo.user.nome}: ${data.motivo}`
      }
      await tx.pedidoEvento.create({ data: { pedidoId: id, organizationId: user.organizationId, userId: user.id, descricao: descricao.slice(0, 500) } })
    })
    return jsonResponse({ success: true })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Operação do pedido', error); return serverError()
  }
}
