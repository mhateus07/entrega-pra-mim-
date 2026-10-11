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

// Regra de preço de uma central. PRECO_POR_KM/MULTIPLICADORES são só o padrão
// (landing e centrais sem tabela); o preço real vem de PricingRule por organização.
export interface RegraPreco {
  precoPorKm: number
  valorMinimo: number
  multiplicadores: Record<TipoServico, number>
  // bairro normalizado → valor fixo (antes do multiplicador)
  bairros?: Record<string, number>
}

export const REGRA_PADRAO: RegraPreco = { precoPorKm: PRECO_POR_KM, valorMinimo: 0, multiplicadores: MULTIPLICADORES }

/** Chave de bairro para comparação: minúsculo, sem acento e espaços repetidos. */
export function normalizarBairro(bairro: string): string {
  return bairro.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

const centavos = (valor: number) => Math.round(valor * 100) / 100

// Calcular preço da entrega com a regra da central. Bairro de destino com preço
// fixo substitui o cálculo por km; o multiplicador do serviço e o mínimo valem sempre.
export function calcularPrecoComRegra(
  regra: RegraPreco,
  distanciaKm: number,
  tipoServico: TipoServico,
  bairroDestino?: string | null,
): Omit<ResultadoPreco, 'tempoEstimado'> & { precoFixoBairro: boolean } {
  const fixo = bairroDestino ? regra.bairros?.[normalizarBairro(bairroDestino)] : undefined
  const multiplicador = regra.multiplicadores[tipoServico]
  const valorBase = centavos(fixo ?? distanciaKm * regra.precoPorKm)
  const valorTotal = centavos(Math.max(valorBase * multiplicador, regra.valorMinimo))

  return { distanciaKm, tipoServico, valorBase, multiplicador, valorTotal, precoFixoBairro: fixo !== undefined }
}

// Preço com a regra padrão (landing e demonstrações)
export function calcularPreco(
  distanciaKm: number,
  tipoServico: TipoServico
): Omit<ResultadoPreco, 'tempoEstimado'> {
  const { precoFixoBairro: _, ...preco } = calcularPrecoComRegra(REGRA_PADRAO, distanciaKm, tipoServico)
  return preco
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
