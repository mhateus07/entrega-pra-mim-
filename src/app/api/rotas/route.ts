import { NextRequest, NextResponse } from 'next/server'
import { calcularRotaSchema } from '@/lib/validations'
import { calcularRota, calcularDistanciaHaversine } from '@/lib/google-maps'
import { calcularPrecoCompleto, estimarTempo, validarDistancia } from '@/lib/pricing'
import { ApiResponse, RotaCalculada } from '@/types'

// POST /api/rotas - Calcular rota e preço
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = calcularRotaSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validation.error.issues,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    const origem = {
      latitude: data.origemLatitude,
      longitude: data.origemLongitude,
    }

    const destino = {
      latitude: data.destinoLatitude,
      longitude: data.destinoLongitude,
    }

    // Tentar calcular via Google Maps API
    const rota = await calcularRota(origem, destino)

    let distanciaKm: number
    let duracaoMinutos: number
    let polyline: string | undefined

    if (rota) {
      distanciaKm = rota.distanciaKm
      duracaoMinutos = rota.duracaoMinutos
      polyline = rota.polyline
    } else {
      // Fallback: cálculo Haversine
      distanciaKm = calcularDistanciaHaversine(origem, destino)
      duracaoMinutos = estimarTempo(distanciaKm)
    }

    // Validar distância
    const validacao = validarDistancia(distanciaKm)
    if (!validacao.valido) {
      return NextResponse.json(
        { success: false, error: validacao.mensagem },
        { status: 400 }
      )
    }

    // Calcular preço
    const preco = calcularPrecoCompleto(distanciaKm, duracaoMinutos, data.tipoServico)

    const resultado: RotaCalculada = {
      distanciaKm: Number(distanciaKm.toFixed(2)),
      duracaoMinutos,
      valorBase: preco.valorBase,
      multiplicador: preco.multiplicador,
      valorTotal: preco.valorTotal,
      polyline,
    }

    const response: ApiResponse<RotaCalculada> = {
      success: true,
      data: resultado,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao calcular rota:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao calcular rota' },
      { status: 500 }
    )
  }
}
