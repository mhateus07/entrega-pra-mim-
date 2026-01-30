import { calcularDistanciaHaversine, Coordenadas } from './google-maps'

// Tipos de status e dias da semana
type StatusMotoboy = 'DISPONIVEL' | 'EM_ENTREGA' | 'OFFLINE'
type DiaSemana = 'DOMINGO' | 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO'

// Pesos do algoritmo de alocação
export const PESOS_ALOCACAO = {
  proximidade: 0.4,    // 40%
  avaliacao: 0.35,     // 35%
  disponibilidade: 0.25, // 25% (tempo ocioso - FIFO)
}

// Tipo para motoboy com dados necessários para alocação
export interface MotoboyParaAlocacao {
  id: string
  latitudeAtual: number | null
  longitudeAtual: number | null
  avaliacaoMedia: number
  ultimaAtividade: Date | null
  status: StatusMotoboy
  disponibilidades?: {
    diaSemana: DiaSemana
    horaInicio: string
    horaFim: string
    ativo: boolean
  }[]
}

// Resultado do cálculo de score
export interface ScoreMotoboy {
  motoboyId: string
  scoreTotal: number
  scoreProximidade: number
  scoreAvaliacao: number
  scoreDisponibilidade: number
  distanciaKm: number
  tempoOciosoMinutos: number
}

// Mapear dia da semana para enum
const DIAS_SEMANA: DiaSemana[] = [
  'DOMINGO',
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
]

// Verificar se motoboy está disponível no horário atual
export function verificarDisponibilidadeHorario(
  disponibilidades: MotoboyParaAlocacao['disponibilidades'],
  dataHora: Date = new Date()
): boolean {
  if (!disponibilidades || disponibilidades.length === 0) {
    return false
  }

  const diaSemana = DIAS_SEMANA[dataHora.getDay()]
  const horaAtual = `${dataHora.getHours().toString().padStart(2, '0')}:${dataHora.getMinutes().toString().padStart(2, '0')}`

  const disponibilidadeDia = disponibilidades.find(
    (d) => d.diaSemana === diaSemana && d.ativo
  )

  if (!disponibilidadeDia) {
    return false
  }

  return horaAtual >= disponibilidadeDia.horaInicio && horaAtual <= disponibilidadeDia.horaFim
}

// Normalizar valor para escala 0-1
function normalizar(valor: number, min: number, max: number): number {
  if (max === min) return 0.5
  return Math.max(0, Math.min(1, (valor - min) / (max - min)))
}

// Calcular tempo ocioso em minutos
function calcularTempoOcioso(ultimaAtividade: Date | null): number {
  if (!ultimaAtividade) {
    // Se nunca teve atividade, considera 24 horas (prioridade alta)
    return 24 * 60
  }

  const agora = new Date()
  const diffMs = agora.getTime() - ultimaAtividade.getTime()
  return Math.floor(diffMs / (1000 * 60))
}

// Calcular score de um motoboy
export function calcularScoreMotoboy(
  motoboy: MotoboyParaAlocacao,
  origemPedido: Coordenadas,
  todasDistancias: number[],
  todosTemposOciosos: number[],
  todasAvaliacoes: number[]
): ScoreMotoboy | null {
  // Verificar se tem localização
  if (motoboy.latitudeAtual === null || motoboy.longitudeAtual === null) {
    return null
  }

  // Calcular distância até a origem do pedido
  const distanciaKm = calcularDistanciaHaversine(
    { latitude: motoboy.latitudeAtual, longitude: motoboy.longitudeAtual },
    origemPedido
  )

  // Calcular tempo ocioso
  const tempoOciosoMinutos = calcularTempoOcioso(motoboy.ultimaAtividade)

  // Normalizar valores (inverter proximidade pois menor é melhor)
  const minDist = Math.min(...todasDistancias)
  const maxDist = Math.max(...todasDistancias)
  const proximidadeNormalizada = 1 - normalizar(distanciaKm, minDist, maxDist)

  const minAval = Math.min(...todasAvaliacoes)
  const maxAval = Math.max(...todasAvaliacoes)
  const avaliacaoNormalizada = normalizar(motoboy.avaliacaoMedia, minAval, maxAval)

  const minOcioso = Math.min(...todosTemposOciosos)
  const maxOcioso = Math.max(...todosTemposOciosos)
  const disponibilidadeNormalizada = normalizar(tempoOciosoMinutos, minOcioso, maxOcioso)

  // Calcular scores parciais
  const scoreProximidade = PESOS_ALOCACAO.proximidade * proximidadeNormalizada
  const scoreAvaliacao = PESOS_ALOCACAO.avaliacao * avaliacaoNormalizada
  const scoreDisponibilidade = PESOS_ALOCACAO.disponibilidade * disponibilidadeNormalizada

  // Score total
  const scoreTotal = scoreProximidade + scoreAvaliacao + scoreDisponibilidade

  return {
    motoboyId: motoboy.id,
    scoreTotal,
    scoreProximidade,
    scoreAvaliacao,
    scoreDisponibilidade,
    distanciaKm,
    tempoOciosoMinutos,
  }
}

// Encontrar melhor motoboy para um pedido
export function encontrarMelhorMotoboy(
  motoboys: MotoboyParaAlocacao[],
  origemPedido: Coordenadas,
  verificarHorario: boolean = true
): ScoreMotoboy | null {
  // Filtrar motoboys disponíveis
  const motoboysFiltrados = motoboys.filter((m) => {
    // Deve estar online e disponível
    if (m.status !== 'DISPONIVEL') {
      return false
    }

    // Deve ter localização
    if (m.latitudeAtual === null || m.longitudeAtual === null) {
      return false
    }

    // Verificar horário de trabalho
    if (verificarHorario && !verificarDisponibilidadeHorario(m.disponibilidades)) {
      return false
    }

    return true
  })

  if (motoboysFiltrados.length === 0) {
    return null
  }

  // Pré-calcular valores para normalização
  const todasDistancias = motoboysFiltrados.map((m) =>
    calcularDistanciaHaversine(
      { latitude: m.latitudeAtual!, longitude: m.longitudeAtual! },
      origemPedido
    )
  )

  const todosTemposOciosos = motoboysFiltrados.map((m) =>
    calcularTempoOcioso(m.ultimaAtividade)
  )

  const todasAvaliacoes = motoboysFiltrados.map((m) => m.avaliacaoMedia)

  // Calcular scores
  const scores = motoboysFiltrados
    .map((m) =>
      calcularScoreMotoboy(
        m,
        origemPedido,
        todasDistancias,
        todosTemposOciosos,
        todasAvaliacoes
      )
    )
    .filter((s): s is ScoreMotoboy => s !== null)

  if (scores.length === 0) {
    return null
  }

  // Ordenar por score (maior primeiro)
  scores.sort((a, b) => b.scoreTotal - a.scoreTotal)

  return scores[0]
}

// Encontrar múltiplos motoboys ordenados por score
export function encontrarMotoboysOrdenados(
  motoboys: MotoboyParaAlocacao[],
  origemPedido: Coordenadas,
  limite: number = 5,
  verificarHorario: boolean = true
): ScoreMotoboy[] {
  // Filtrar motoboys disponíveis
  const motoboysFiltrados = motoboys.filter((m) => {
    if (m.status !== 'DISPONIVEL') return false
    if (m.latitudeAtual === null || m.longitudeAtual === null) return false
    if (verificarHorario && !verificarDisponibilidadeHorario(m.disponibilidades)) return false
    return true
  })

  if (motoboysFiltrados.length === 0) {
    return []
  }

  // Pré-calcular valores para normalização
  const todasDistancias = motoboysFiltrados.map((m) =>
    calcularDistanciaHaversine(
      { latitude: m.latitudeAtual!, longitude: m.longitudeAtual! },
      origemPedido
    )
  )

  const todosTemposOciosos = motoboysFiltrados.map((m) =>
    calcularTempoOcioso(m.ultimaAtividade)
  )

  const todasAvaliacoes = motoboysFiltrados.map((m) => m.avaliacaoMedia)

  // Calcular scores
  const scores = motoboysFiltrados
    .map((m) =>
      calcularScoreMotoboy(
        m,
        origemPedido,
        todasDistancias,
        todosTemposOciosos,
        todasAvaliacoes
      )
    )
    .filter((s): s is ScoreMotoboy => s !== null)
    .sort((a, b) => b.scoreTotal - a.scoreTotal)
    .slice(0, limite)

  return scores
}
