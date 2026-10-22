import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { jsonResponse } from '@/lib/json-response'
import { requireGestor, requireOwner, badRequest, serverError } from '@/lib/auth-helpers'

export async function GET() {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response
    const organizationId = auth.user.organizationId
    const [config, pedidos, ocorrencias] = await Promise.all([
      prisma.organizationSettings.findUnique({ where: { organizationId }, select: { atrasoColetaMinutos: true, atrasoEntregaMinutos: true, telefoneSuporte: true, despachoTtlSegundos: true, despachoMaxTentativas: true } }),
      prisma.pedido.findMany({ where: { organizationId, status: { in: ['ACEITO', 'EM_COLETA', 'EM_ENTREGA'] } }, orderBy: { createdAt: 'asc' }, take: 100,
        select: { id: true, status: true, aceitoEm: true, coletadoEm: true, cliente: { select: { user: { select: { nome: true } } } },
          enderecoOrigem: { select: { bairro: true, latitude: true, longitude: true } }, enderecoDestino: { select: { bairro: true, latitude: true, longitude: true } },
          motoboy: { select: { latitudeAtual: true, longitudeAtual: true, localizacaoEm: true, user: { select: { nome: true } } } } } }),
      prisma.ocorrencia.findMany({ where: { organizationId, resolvidaEm: null }, orderBy: { createdAt: 'asc' }, take: 100, select: { id: true, pedidoId: true, tipo: true, descricao: true, createdAt: true } }),
    ])
    const configuracao = config ?? { atrasoColetaMinutos: 20, atrasoEntregaMinutos: 45, telefoneSuporte: null, despachoTtlSegundos: 90, despachoMaxTentativas: 3 }
    return jsonResponse({ success: true, data: { config: configuracao, ocorrencias, pedidos: pedidos.map(p => {
      const etapaEm = p.status === 'EM_ENTREGA' ? p.coletadoEm : p.aceitoEm
      const minutos = etapaEm ? Math.floor((Date.now() - etapaEm.getTime()) / 60000) : 0
      return { ...p, minutos, atrasado: minutos > (p.status === 'EM_ENTREGA' ? configuracao.atrasoEntregaMinutos : configuracao.atrasoColetaMinutos) }
    }) } })
  } catch (e) { console.error('Console operacional', e); return serverError() }
}

const configSchema = z.object({ atrasoColetaMinutos: z.number().int().min(5).max(240), atrasoEntregaMinutos: z.number().int().min(5).max(480), despachoTtlSegundos: z.number().int().min(20).max(300), despachoMaxTentativas: z.number().int().min(1).max(10), telefoneSuporte: z.string().trim().max(30).regex(/^[+\d ()-]*$/) })
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireOwner()
    if (!auth.authenticated) return auth.response
    const body = configSchema.safeParse(await request.json().catch(() => null))
    if (!body.success) return badRequest('Confira os limites e o telefone informado')
    await prisma.organizationSettings.upsert({ where: { organizationId: auth.user.organizationId }, create: { organizationId: auth.user.organizationId, ...body.data }, update: body.data })
    return jsonResponse({ success: true })
  } catch (e) { console.error('Configuração operacional', e); return serverError() }
}
