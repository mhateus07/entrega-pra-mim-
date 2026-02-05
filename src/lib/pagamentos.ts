// =============================================================================
// Biblioteca de Pagamentos - SISTEMA MOCK
// =============================================================================
// AVISO: Este é um sistema SIMULADO para desenvolvimento/demonstração.
// Para produção, integre com um gateway real (Mercado Pago, Stripe, Pagar.me).
//
// Checklist para produção:
// [ ] Integrar com gateway de pagamento real
// [ ] Implementar tokenização de cartões (NUNCA armazene números completos)
// [ ] Configurar webhooks com verificação de assinatura
// [ ] Adicionar idempotency keys para evitar cobranças duplicadas
// [ ] Implementar PCI DSS compliance
// =============================================================================

export type MetodoPagamento = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO'
export type StatusPagamento = 'PENDENTE' | 'PROCESSANDO' | 'APROVADO' | 'RECUSADO' | 'CANCELADO' | 'REEMBOLSADO'

// Indica se o sistema está em modo mock (para exibir avisos na UI)
export const IS_PAYMENT_MOCK = true

// Configurações
export const CONFIG_PAGAMENTO = {
  taxaPlataforma: 0.15, // 15% de taxa da plataforma
  pixExpiracaoMinutos: 30,
  // IMPORTANTE: Em produção, esta variável DEVE estar configurada
  // Não use fallback para evitar aceitar webhooks falsos
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
}

// Tipos
export interface DadosCartao {
  numero: string
  nome: string
  validade: string // MM/YY
  cvv: string
}

export interface ResultadoPagamentoPix {
  success: boolean
  qrCode: string // Base64 da imagem
  copiaCola: string
  expiraEm: Date
  gatewayId: string
}

export interface ResultadoPagamentoCartao {
  success: boolean
  aprovado: boolean
  gatewayId: string
  mensagem: string
  ultimos4?: string
  bandeira?: string
}

export interface DadosPagamento {
  pedidoId: string
  clienteId: string
  valor: number
  metodo: MetodoPagamento
  cartao?: DadosCartao
}

// Funções auxiliares
export function calcularTaxaPlataforma(valorTotal: number): number {
  return Number((valorTotal * CONFIG_PAGAMENTO.taxaPlataforma).toFixed(2))
}

export function calcularValorMotoboy(valorTotal: number): number {
  const taxa = calcularTaxaPlataforma(valorTotal)
  return Number((valorTotal - taxa).toFixed(2))
}

export function formatarValor(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

// Validação de cartão (Luhn Algorithm)
export function validarNumeroCartao(numero: string): boolean {
  const digitos = numero.replace(/\D/g, '')
  if (digitos.length < 13 || digitos.length > 19) return false

  let soma = 0
  let dobrar = false

  for (let i = digitos.length - 1; i >= 0; i--) {
    let digito = parseInt(digitos[i], 10)
    if (dobrar) {
      digito *= 2
      if (digito > 9) digito -= 9
    }
    soma += digito
    dobrar = !dobrar
  }

  return soma % 10 === 0
}

// Detectar bandeira do cartão
export function detectarBandeira(numero: string): string {
  const digitos = numero.replace(/\D/g, '')

  if (/^4/.test(digitos)) return 'VISA'
  if (/^5[1-5]/.test(digitos)) return 'MASTERCARD'
  if (/^3[47]/.test(digitos)) return 'AMEX'
  if (/^6(?:011|5)/.test(digitos)) return 'DISCOVER'
  if (/^(?:2131|1800|35)/.test(digitos)) return 'JCB'
  if (/^3(?:0[0-5]|[68])/.test(digitos)) return 'DINERS'
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(digitos)) return 'ELO'
  if (/^(606282|3841)/.test(digitos)) return 'HIPERCARD'

  return 'OUTRO'
}

// Validar data de validade
export function validarValidade(validade: string): boolean {
  const match = validade.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return false

  const mes = parseInt(match[1], 10)
  const ano = parseInt('20' + match[2], 10)

  if (mes < 1 || mes > 12) return false

  const agora = new Date()
  const expira = new Date(ano, mes, 0) // Último dia do mês

  return expira > agora
}

// Validar CVV
export function validarCVV(cvv: string, bandeira: string): boolean {
  const digitos = cvv.replace(/\D/g, '')
  const tamanho = bandeira === 'AMEX' ? 4 : 3
  return digitos.length === tamanho
}

// Mascarar número do cartão
export function mascararCartao(numero: string): string {
  const digitos = numero.replace(/\D/g, '')
  return '**** **** **** ' + digitos.slice(-4)
}

// ============================================================
// GATEWAY SIMULADO (substituir por integração real)
// ============================================================

// Gerar QR Code PIX simulado
export async function gerarPagamentoPix(
  dados: DadosPagamento
): Promise<ResultadoPagamentoPix> {
  // Simular delay de API
  await new Promise((resolve) => setTimeout(resolve, 500))

  const gatewayId = `PIX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const expiraEm = new Date(Date.now() + CONFIG_PAGAMENTO.pixExpiracaoMinutos * 60 * 1000)

  // QR Code simulado (em produção, usar biblioteca como qrcode)
  const copiaCola = `00020126580014br.gov.bcb.pix0136${gatewayId}520400005303986540${dados.valor.toFixed(2)}5802BR5925ENTREGA PRA MIM LTDA6009SAO PAULO62070503***6304`

  // QR Code base64 simulado (placeholder)
  const qrCode = `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="90" text-anchor="middle" font-size="14" fill="#333">PIX QR Code</text>
      <text x="100" y="110" text-anchor="middle" font-size="12" fill="#666">${formatarValor(dados.valor)}</text>
      <text x="100" y="130" text-anchor="middle" font-size="10" fill="#999">ID: ${gatewayId.slice(0, 15)}</text>
    </svg>
  `).toString('base64')}`

  return {
    success: true,
    qrCode,
    copiaCola,
    expiraEm,
    gatewayId,
  }
}

// Processar pagamento com cartão simulado
export async function processarPagamentoCartao(
  dados: DadosPagamento
): Promise<ResultadoPagamentoCartao> {
  // Simular delay de API
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (!dados.cartao) {
    return {
      success: false,
      aprovado: false,
      gatewayId: '',
      mensagem: 'Dados do cartão não informados',
    }
  }

  // Validações
  if (!validarNumeroCartao(dados.cartao.numero)) {
    return {
      success: false,
      aprovado: false,
      gatewayId: '',
      mensagem: 'Número do cartão inválido',
    }
  }

  if (!validarValidade(dados.cartao.validade)) {
    return {
      success: false,
      aprovado: false,
      gatewayId: '',
      mensagem: 'Data de validade inválida ou expirada',
    }
  }

  const bandeira = detectarBandeira(dados.cartao.numero)

  if (!validarCVV(dados.cartao.cvv, bandeira)) {
    return {
      success: false,
      aprovado: false,
      gatewayId: '',
      mensagem: 'CVV inválido',
    }
  }

  // Simular aprovação (90% de chance)
  const aprovado = Math.random() > 0.1

  const gatewayId = `CARD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    success: true,
    aprovado,
    gatewayId,
    mensagem: aprovado ? 'Pagamento aprovado' : 'Pagamento recusado pela operadora',
    ultimos4: dados.cartao.numero.slice(-4),
    bandeira,
  }
}

// Verificar status do pagamento PIX
export async function verificarStatusPix(gatewayId: string): Promise<StatusPagamento> {
  // Simular delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Em produção, consultar o gateway real
  // Aqui simulamos um status aleatório para demonstração
  const random = Math.random()
  if (random < 0.3) return 'APROVADO'
  if (random < 0.35) return 'CANCELADO'
  return 'PENDENTE'
}

// Cancelar/Estornar pagamento
export async function cancelarPagamento(gatewayId: string): Promise<boolean> {
  // Simular delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Em produção, chamar API do gateway
  return true
}

// Reembolsar pagamento
export async function reembolsarPagamento(
  gatewayId: string,
  valor?: number
): Promise<boolean> {
  // Simular delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Em produção, chamar API do gateway
  return true
}

// Labels para exibição
export const LABELS_METODO_PAGAMENTO: Record<MetodoPagamento, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  DINHEIRO: 'Dinheiro',
}

export const LABELS_STATUS_PAGAMENTO: Record<StatusPagamento, string> = {
  PENDENTE: 'Pendente',
  PROCESSANDO: 'Processando',
  APROVADO: 'Aprovado',
  RECUSADO: 'Recusado',
  CANCELADO: 'Cancelado',
  REEMBOLSADO: 'Reembolsado',
}

export const CORES_STATUS_PAGAMENTO: Record<StatusPagamento, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  PROCESSANDO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  APROVADO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  RECUSADO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CANCELADO: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  REEMBOLSADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

export const ICONES_BANDEIRA: Record<string, string> = {
  VISA: '💳',
  MASTERCARD: '💳',
  AMEX: '💳',
  ELO: '💳',
  HIPERCARD: '💳',
  OUTRO: '💳',
}
