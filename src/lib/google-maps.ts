const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

export interface Coordenadas {
  latitude: number
  longitude: number
}

export interface EnderecoParaGeocodificar {
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep?: string
}

export interface ResultadoRota {
  distanciaKm: number
  duracaoMinutos: number
  polyline: string
  origem: Coordenadas
  destino: Coordenadas
}

export interface ResultadoGeocodificacao {
  latitude: number
  longitude: number
  enderecoFormatado: string
}

// Geocodificar um endereço (texto -> coordenadas)
export async function geocodificarEndereco(
  endereco: EnderecoParaGeocodificar
): Promise<ResultadoGeocodificacao | null> {
  const enderecoStr = `${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.estado}, Brasil`

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.append('address', enderecoStr)
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY)
  url.searchParams.append('language', 'pt-BR')
  url.searchParams.append('region', 'br')

  try {
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const resultado = data.results[0]
      return {
        latitude: resultado.geometry.location.lat,
        longitude: resultado.geometry.location.lng,
        enderecoFormatado: resultado.formatted_address,
      }
    }

    console.error('Erro na geocodificacao:', data.status)
    return null
  } catch (error) {
    console.error('Erro ao geocodificar endereco:', error)
    return null
  }
}

// Geocodificação reversa (coordenadas -> endereço)
export async function geocodificacaoReversa(
  coordenadas: Coordenadas
): Promise<ResultadoGeocodificacao | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.append('latlng', `${coordenadas.latitude},${coordenadas.longitude}`)
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY)
  url.searchParams.append('language', 'pt-BR')

  try {
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const resultado = data.results[0]
      return {
        latitude: coordenadas.latitude,
        longitude: coordenadas.longitude,
        enderecoFormatado: resultado.formatted_address,
      }
    }

    return null
  } catch (error) {
    console.error('Erro na geocodificacao reversa:', error)
    return null
  }
}

// Calcular rota entre dois pontos (Routes API — substitui a Directions API legada,
// que não pode mais ser ativada em projetos novos do Google Cloud)
export async function calcularRota(
  origem: Coordenadas,
  destino: Coordenadas
): Promise<ResultadoRota | null> {
  if (!GOOGLE_MAPS_API_KEY) return null

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origem.latitude, longitude: origem.longitude } } },
        destination: { location: { latLng: { latitude: destino.latitude, longitude: destino.longitude } } },
        travelMode: 'DRIVE', // moto usa rotas de carro
        routingPreference: 'TRAFFIC_AWARE',
        languageCode: 'pt-BR',
        regionCode: 'BR',
      }),
      signal: AbortSignal.timeout(8000),
    })
    const data = await response.json()
    const rota = data?.routes?.[0]

    if (response.ok && rota?.distanceMeters) {
      return {
        distanciaKm: rota.distanceMeters / 1000,
        duracaoMinutos: Math.ceil(parseInt(String(rota.duration ?? '0'), 10) / 60),
        polyline: rota.polyline?.encodedPolyline ?? '',
        origem,
        destino,
      }
    }

    console.error('Erro ao calcular rota:', data?.error?.status ?? response.status, data?.error?.message ?? '')
    return null
  } catch (error) {
    console.error('Erro ao calcular rota:', error)
    return null
  }
}

// Calcular distância em linha reta (Haversine) - para casos sem API
export function calcularDistanciaHaversine(
  origem: Coordenadas,
  destino: Coordenadas
): number {
  const R = 6371 // Raio da Terra em km
  const dLat = grausParaRadianos(destino.latitude - origem.latitude)
  const dLon = grausParaRadianos(destino.longitude - origem.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(grausParaRadianos(origem.latitude)) *
      Math.cos(grausParaRadianos(destino.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function grausParaRadianos(graus: number): number {
  return graus * (Math.PI / 180)
}
