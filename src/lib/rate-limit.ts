// =============================================================================
// Rate Limiting
// =============================================================================
// Limita o número de requisições por IP para prevenir abusos
// Usa armazenamento em memória (para produção, considere Redis)
// =============================================================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Armazenamento em memória para rate limiting
// Em produção, use Redis ou outro armazenamento distribuído
const rateLimitStore = new Map<string, RateLimitEntry>()

// Limpa entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Limpa a cada 1 minuto

export interface RateLimitConfig {
  // Número máximo de requisições permitidas
  limit: number
  // Janela de tempo em milissegundos
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

// Configurações padrão para diferentes tipos de endpoints
export const RATE_LIMIT_CONFIGS = {
  // APIs gerais: 100 requisições por minuto
  api: { limit: 100, windowMs: 60 * 1000 },
  // Auth (login, registro): 10 requisições por minuto
  auth: { limit: 10, windowMs: 60 * 1000 },
  // Endpoints sensíveis (pagamentos): 20 requisições por minuto
  sensitive: { limit: 20, windowMs: 60 * 1000 },
  // Polling (rastreamento, status): 60 requisições por minuto
  polling: { limit: 60, windowMs: 60 * 1000 },
} as const

/**
 * Verifica rate limit para um identificador (geralmente IP)
 *
 * @param identifier - Identificador único (IP, userId, etc)
 * @param config - Configuração de rate limit
 * @returns Resultado com status e informações de limite
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.api
): RateLimitResult {
  const now = Date.now()
  const key = identifier

  let entry = rateLimitStore.get(key)

  // Se não existe ou expirou, criar nova entrada
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)
  }

  // Incrementar contador
  entry.count++

  const remaining = Math.max(0, config.limit - entry.count)
  const success = entry.count <= config.limit

  return {
    success,
    limit: config.limit,
    remaining,
    resetTime: entry.resetTime,
  }
}

/**
 * Obtém o IP do cliente a partir do request
 * Considera headers de proxy (X-Forwarded-For)
 */
export function getClientIP(request: Request): string {
  // Tenta obter IP real atrás de proxy
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for pode conter múltiplos IPs, pegar o primeiro
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback para IP genérico (desenvolvimento)
  return 'unknown'
}

/**
 * Cria uma chave de rate limit combinando IP e endpoint
 */
export function createRateLimitKey(ip: string, endpoint: string): string {
  return `${ip}:${endpoint}`
}

/**
 * Headers de rate limit para incluir na resposta
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  }
}
