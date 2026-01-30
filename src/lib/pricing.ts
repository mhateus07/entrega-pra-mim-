// Tipo de serviço
type TipoServico = 'AGENDADA' | 'DOCUMENTOS' | 'EXPRESSA'

// Preço base por km
export const PRECO_POR_KM = 3.0

// Multiplicadores por tipo de serviço
export const MULTIPLICADORES: Record<TipoServico, number> = {
  AGENDADA: 1.0,    // Preço base
  DOCUMENTOS: 1.2,  // +20%
  EXPRESSA: 1.5,    // +50%
}

// Nomes amigáveis dos tipos de serviço
export const NOMES_SERVICO: Record<TipoServico, string> = {
  AGENDADA: 'Entrega Agendada',
  DOCUMENTOS: 'Entrega de Documentos',
  EXPRESSA: 'Entrega Expressa',
}

// Descrições dos tipos de serviço
export const DESCRICOES_SERVICO: Record<TipoServico, string> = {
  AGENDADA: 'Agende a coleta para data e horário específicos',
  DOCUMENTOS: 'Serviço especial com confirmação de recebimento',
  EXPRESSA: 'Coleta imediata com prioridade máxima',
}

// Interface para resultado do cálculo
export interface ResultadoPreco {
  distanciaKm: number
  tipoServico: TipoServico
  valorBase: number
  multiplicador: number
  valorTotal: number
  tempoEstimado: number // em minutos
}

// Calcular preço da entrega
export function calcularPreco(
  distanciaKm: number,
  tipoServico: TipoServico
): Omit<ResultadoPreco, 'tempoEstimado'> {
  const multiplicador = MULTIPLICADORES[tipoServico]
  const valorBase = distanciaKm * PRECO_POR_KM
  const valorTotal = valorBase * multiplicador

  return {
    distanciaKm,
    tipoServico,
    valorBase: Number(valorBase.toFixed(2)),
    multiplicador,
    valorTotal: Number(valorTotal.toFixed(2)),
  }
}

// Calcular preço completo com tempo estimado
export function calcularPrecoCompleto(
  distanciaKm: number,
  duracaoMinutos: number,
  tipoServico: TipoServico
): ResultadoPreco {
  const precoBase = calcularPreco(distanciaKm, tipoServico)

  return {
    ...precoBase,
    tempoEstimado: duracaoMinutos,
  }
}

// Formatar valor para exibição
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

// Formatar tempo estimado para exibição
export function formatarTempo(minutos: number): string {
  if (minutos < 60) {
    return `${minutos} min`
  }

  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60

  if (mins === 0) {
    return `${horas}h`
  }

  return `${horas}h ${mins}min`
}

// Formatar distância para exibição
export function formatarDistancia(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }

  return `${km.toFixed(1)} km`
}

// Obter estimativa de tempo baseado na distância (fallback se API falhar)
export function estimarTempo(distanciaKm: number): number {
  // Estimativa: 30 km/h em média no trânsito urbano
  const velocidadeMedia = 30
  return Math.ceil((distanciaKm / velocidadeMedia) * 60)
}

// Validar distância mínima e máxima
export const DISTANCIA_MINIMA_KM = 0.5
export const DISTANCIA_MAXIMA_KM = 50

export function validarDistancia(distanciaKm: number): {
  valido: boolean
  mensagem?: string
} {
  if (distanciaKm < DISTANCIA_MINIMA_KM) {
    return {
      valido: false,
      mensagem: `Distância mínima é de ${formatarDistancia(DISTANCIA_MINIMA_KM)}`,
    }
  }

  if (distanciaKm > DISTANCIA_MAXIMA_KM) {
    return {
      valido: false,
      mensagem: `Distância máxima é de ${formatarDistancia(DISTANCIA_MAXIMA_KM)}`,
    }
  }

  return { valido: true }
}
