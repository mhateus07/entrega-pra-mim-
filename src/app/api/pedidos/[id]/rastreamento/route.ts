import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/pedidos/[id]/rastreamento - Obter dados de rastreamento do pedido
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        tipoServico: true,
        aceitoEm: true,
        coletadoEm: true,
        entregueEm: true,
        motoboy: {
          select: {
            id: true,
            latitudeAtual: true,
            longitudeAtual: true,
            ultimaAtividade: true,
            status: true,
            user: {
              select: {
                nome: true,
                telefone: true,
              },
            },
          },
        },
        enderecoOrigem: {
          select: {
            latitude: true,
            longitude: true,
            logradouro: true,
            numero: true,
            bairro: true,
          },
        },
        enderecoDestino: {
          select: {
            latitude: true,
            longitude: true,
            logradouro: true,
            numero: true,
            bairro: true,
          },
        },
      },
    })

    if (!pedido) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Calcular ETA baseado no status
    let etaMinutos: number | null = null
    if (pedido.status === 'EM_COLETA') {
      etaMinutos = 10 // Tempo estimado até coleta
    } else if (pedido.status === 'EM_ENTREGA') {
      etaMinutos = 15 // Tempo estimado até entrega
    }

    return NextResponse.json({
      success: true,
      data: {
        ...pedido,
        etaMinutos,
        atualizadoEm: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Erro ao obter rastreamento:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao obter rastreamento' },
      { status: 500 }
    )
  }
}
