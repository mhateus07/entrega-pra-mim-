import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/motoboys/[id]/localizacao - Atualizar localização
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { latitude, longitude } = body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Latitude e longitude são obrigatórios' },
        { status: 400 }
      )
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
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar localização' },
      { status: 500 }
    )
  }
}

// GET /api/motoboys/[id]/localizacao - Obter localização
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
      return NextResponse.json(
        { success: false, error: 'Motoboy não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: motoboy,
    })
  } catch (error) {
    console.error('Erro ao obter localização:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao obter localização' },
      { status: 500 }
    )
  }
}
