import { jsonResponse } from '@/lib/json-response'
import { NextRequest } from 'next/server'
import { calcularRotaSchema } from '@/lib/validations'
import { calcularRota, calcularDistanciaHaversine } from '@/lib/google-maps'
import { calcularPrecoComRegra, estimarTempo, validarDistancia } from '@/lib/pricing'
import { carregarRegraPreco } from '@/lib/pricing-org'
import { ApiResponse, RotaCalculada } from '@/types'
import { requireOrgAccess, applyMapsRateLimit } from '@/lib/auth-helpers'

// POST /api/rotas - Calcular rota e preço
export async function POST(request: NextRequest) {
  try {
    // Cada chamada consome cota paga do Google Maps
    const auth = await requireOrgAccess()
    if (!auth.authenticated) return auth.response
    const rateLimit = await applyMapsRateLimit(auth.user.id)
    if (!rateLimit.success) return rateLimit.response

    const body = await request.json()

    const validation = calcularRotaSchema.safeParse(body)
    if (!validation.success) {
      return jsonResponse(
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
    const rota = await calcularRota(origem, destino, { organizationId: auth.user.organizationId })

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
      return jsonResponse(
        { success: false, error: validacao.mensagem },
        { status: 400 }
      )
    }

    // Preço pela tabela da central (mesma regra do POST /api/pedidos)
    const regra = await carregarRegraPreco(auth.user.organizationId)
    const preco = calcularPrecoComRegra(regra, distanciaKm, data.tipoServico, data.bairroDestino)

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

    return jsonResponse(response)
  } catch (error) {
    console.error('Erro ao calcular rota:', error)
    return jsonResponse(
      { success: false, error: 'Erro ao calcular rota' },
      { status: 500 }
    )
  }
}
