import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { jsonResponse } from '@/lib/json-response'
import { requireOrgAccess, requireOwner, isGestor, forbidden, badRequest, serverError } from '@/lib/auth-helpers'
import { money } from '@/lib/money'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireOrgAccess()
    if (!auth.authenticated) return auth.response
    const user = auth.user
    const motoboyId = isGestor(user) ? request.nextUrl.searchParams.get('motoboyId') : user.orgRole === 'DRIVER' ? user.motoboyId : null
    if (!motoboyId) return badRequest('Selecione um entregador')
    const motoboy = await prisma.motoboy.findFirst({ where: { id: motoboyId, organizationId: user.organizationId } })
    if (!motoboy) return forbidden()
    const where = { organizationId: user.organizationId, motoboyId }
    const [pedidos, acertos, totalAcertos] = await Promise.all([
      prisma.pedido.findMany({ where: { ...where, status: 'ENTREGUE' }, select: { valorRepasse: true, repasseEstimado: true, pagamento: { select: { metodo: true, status: true, valor: true } } } }),
      prisma.acerto.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.acerto.aggregate({ where, _sum: { valor: true } }),
    ])
    let ganhos = new Prisma.Decimal(0), dinheiro = new Prisma.Decimal(0)
    for (const p of pedidos) {
      ganhos = ganhos.plus(p.valorRepasse ?? 0)
      if (p.pagamento?.metodo === 'DINHEIRO' && p.pagamento.status === 'APROVADO') dinheiro = dinheiro.plus(p.pagamento.valor)
    }
    const acertado = totalAcertos._sum.valor ?? new Prisma.Decimal(0)
    return jsonResponse({ success: true, data: { ganhos, dinheiro, acertado, aAcertar: ganhos.minus(dinheiro).minus(acertado), legadosEstimados: pedidos.filter(p => p.repasseEstimado || p.valorRepasse == null).length, acertos, podeRegistrar: user.orgRole === 'OWNER' } })
  } catch (e) { console.error('Extrato de acertos', e); return serverError() }
}

const schema = z.object({ motoboyId: z.string().cuid(), chave: z.string().uuid(), valor: z.number().finite().min(-1000000).max(1000000).refine(v => Math.abs(v) >= 0.01), referencia: z.string().trim().min(5).max(200) })
export async function POST(request: NextRequest) {
  try {
    const auth = await requireOwner()
    if (!auth.authenticated) return auth.response
    const body = schema.safeParse(await request.json().catch(() => null))
    if (!body.success) return badRequest('Informe entregador, valor e referência do comprovante')
    const { motoboyId, chave, referencia, valor } = body.data
    if (!await prisma.motoboy.findFirst({ where: { id: motoboyId, organizationId: auth.user.organizationId } })) return forbidden()
    const resultado = await prisma.acerto.upsert({
      where: { organizationId_chave: { organizationId: auth.user.organizationId, chave } }, update: {},
      create: { organizationId: auth.user.organizationId, criadoPorId: auth.user.id, motoboyId, chave, referencia, valor: money(valor) },
    })
    if (resultado.motoboyId !== motoboyId || !resultado.valor.equals(money(valor)) || resultado.referencia !== referencia) return badRequest('Chave já utilizada para outro acerto')
    return jsonResponse({ success: true, data: resultado })
  } catch (e) { console.error('Registro de acerto', e); return serverError() }
}
