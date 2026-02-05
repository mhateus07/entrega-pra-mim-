import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMotoboyOwnership, requireAuth, notFound, badRequest, serverError } from '@/lib/auth-helpers'

// POST /api/motoboys/[id]/localizacao - Atualizar localização (apenas o próprio motoboy)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se é o próprio motoboy (não permite admin atualizar localização de outro)
    const auth = await requireMotoboyOwnership(id)
    if (!auth.authenticated) return auth.response

    const body = await request.json()
    const { latitude, longitude } = body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return badRequest('Latitude e longitude são obrigatórios')
    }

    const motoboy = await prisma.motoboy.update({
      where: { id },
      data: {
        latitudeAtual: latitude,
        longitudeAtual: longitude,
        ultimaAtividade: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: motoboy.id,
        latitude: motoboy.latitudeAtual,
        longitude: motoboy.longitudeAtual,
        ultimaAtividade: motoboy.ultimaAtividade,
      },
    })
  } catch (error) {
    console.error('Erro ao atualizar localização:', error)
    return serverError('Erro ao atualizar localização')
  }
}

// GET /api/motoboys/[id]/localizacao - Obter localização (autenticado)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Requer autenticação para ver localização de motoboy
    const auth = await requireAuth()
    if (!auth.authenticated) return auth.response

    const motoboy = await prisma.motoboy.findUnique({
      where: { id },
      select: {
        id: true,
        latitudeAtual: true,
        longitudeAtual: true,
        ultimaAtividade: true,
        status: true,
        user: {
          select: {
            nome: true,
          },
        },
      },
    })

    if (!motoboy) {
      return notFound('Motoboy não encontrado')
    }

    return NextResponse.json({
      success: true,
      data: motoboy,
    })
  } catch (error) {
    console.error('Erro ao obter localização:', error)
    return serverError('Erro ao obter localização')
  }
}
