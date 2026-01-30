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

// Calcular rota entre dois pontos
export async function calcularRota(
  origem: Coordenadas,
  destino: Coordenadas
): Promise<ResultadoRota | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.append('origin', `${origem.latitude},${origem.longitude}`)
  url.searchParams.append('destination', `${destino.latitude},${destino.longitude}`)
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY)
  url.searchParams.append('language', 'pt-BR')
  url.searchParams.append('mode', 'driving') // moto usa rotas de carro

  try {
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === 'OK' && data.routes.length > 0) {
      const rota = data.routes[0]
      const leg = rota.legs[0]

      return {
        distanciaKm: leg.distance.value / 1000, // metros -> km
        duracaoMinutos: Math.ceil(leg.duration.value / 60), // segundos -> minutos
        polyline: rota.overview_polyline.points,
        origem,
        destino,
      }
    }

    console.error('Erro ao calcular rota:', data.status)
    return null
  } catch (error) {
    console.error('Erro ao calcular rota:', error)
    return null
  }
}

// Calcular matriz de distâncias (múltiplas origens/destinos)
export interface ResultadoMatrizDistancia {
  origemIndex: number
  destinoIndex: number
  distanciaKm: number
  duracaoMinutos: number
}

export async function calcularMatrizDistancia(
  origens: Coordenadas[],
  destinos: Coordenadas[]
): Promise<ResultadoMatrizDistancia[]> {
  const origensStr = origens.map((o) => `${o.latitude},${o.longitude}`).join('|')
  const destinosStr = destinos.map((d) => `${d.latitude},${d.longitude}`).join('|')

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
  url.searchParams.append('origins', origensStr)
  url.searchParams.append('destinations', destinosStr)
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY)
  url.searchParams.append('language', 'pt-BR')
  url.searchParams.append('mode', 'driving')

  try {
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Erro na matriz de distancia:', data.status)
      return []
    }

    const resultados: ResultadoMatrizDistancia[] = []

    for (let i = 0; i < data.rows.length; i++) {
      for (let j = 0; j < data.rows[i].elements.length; j++) {
        const element = data.rows[i].elements[j]
        if (element.status === 'OK') {
          resultados.push({
            origemIndex: i,
            destinoIndex: j,
            distanciaKm: element.distance.value / 1000,
            duracaoMinutos: Math.ceil(element.duration.value / 60),
          })
        }
      }
    }

    return resultados
  } catch (error) {
    console.error('Erro ao calcular matriz de distancia:', error)
    return []
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
