import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { requireSuperadmin, serverError } from '@/lib/auth-helpers'
import { mesReferencia } from '@/lib/uso'

// GET /api/plataforma/organizacoes - Todas as centrais (equipe da plataforma)
export async function GET() {
  try {
    const auth = await requireSuperadmin()
    if (!auth.authenticated) return auth.response
    const mes = mesReferencia()
    const orgs = await prisma.organization.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true, nome: true, slug: true, plano: true, status: true, createdAt: true,
        membros: { where: { papel: 'OWNER' }, select: { user: { select: { nome: true, email: true, telefone: true } } }, take: 1 },
        uso: { where: { mes }, select: { entregas: true, chamadasMaps: true } },
        _count: { select: { motoboys: true, clientes: true } },
      },
    })
    return jsonResponse({
      success: true,
      data: orgs.map(({ membros, uso, ...o }) => ({ ...o, dono: membros[0]?.user ?? null, usoMes: uso[0] ?? { entregas: 0, chamadasMaps: 0 } })),
    })
  } catch (error) {
    console.error('Erro ao listar centrais:', error)
    return serverError()
  }
}
