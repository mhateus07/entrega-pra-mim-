import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMotoboyOwnership } from '@/lib/auth-helpers'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/motoboys/[id]/saldo - Buscar saldo do motoboy
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Próprio motoboy ou gestão da central (motoboy da organização ativa)
    const auth = await requireMotoboyOwnership(id)
    if (!auth.authenticated) return auth.response

    // Buscar ou criar saldo
    const saldo = await prisma.saldoMotoboy.upsert({
      where: { motoboyId: id },
      create: {
        organizationId: auth.user.organizationId,
        motoboyId: id,
        saldoDisponivel: 0,
        saldoPendente: 0,
        totalRecebido: 0,
      },
      update: {},
    })

    return jsonResponse({
      success: true,
      data: saldo,
    })
  } catch (error) {
    console.error('Erro ao buscar saldo:', error)
    return jsonResponse(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
