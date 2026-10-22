import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireOrgAccess, serverError } from '@/lib/auth-helpers'
import { money } from '@/lib/money'

// GET /api/despacho/ofertas - Ofertas em aberto para o motoboy logado
export async function GET() {
  try {
    const auth = await requireOrgAccess(['DRIVER'])
    if (!auth.authenticated) return auth.response
    if (!auth.user.motoboyId) return jsonResponse({ success: true, data: [] })

    const [ofertas, settings] = await Promise.all([
      prisma.dispatchOffer.findMany({
        where: { organizationId: auth.user.organizationId, motoboyId: auth.user.motoboyId, status: 'OFERTADA', expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: 'asc' },
        select: {
          id: true, expiresAt: true,
          pedido: {
            select: {
              id: true, tipoServico: true, distanciaKm: true, duracaoEstimada: true, valorTotal: true, valorRepasse: true, descricaoItem: true,
              enderecoOrigem: { select: { bairro: true, cidade: true, latitude: true, longitude: true } },
              enderecoDestino: { select: { bairro: true, cidade: true } },
            },
          },
        },
      }),
      prisma.organizationSettings.findUnique({ where: { organizationId: auth.user.organizationId }, select: { repasseMotoboy: true } }),
    ])
    const repasse = settings?.repasseMotoboy ?? 0.7
    // Antes de aceitar, só bairros: o endereço completo aparece depois do aceite
    return jsonResponse({
      success: true,
      data: ofertas.map(({ pedido: { valorTotal, valorRepasse, ...pedido }, ...o }) => ({
        ...o, pedido: { ...pedido, seuGanho: (valorRepasse ?? money(valorTotal.mul(repasse))).toNumber() },
      })),
    })
  } catch (error) {
    console.error('Erro ao listar ofertas:', error)
    return serverError()
  }
}
