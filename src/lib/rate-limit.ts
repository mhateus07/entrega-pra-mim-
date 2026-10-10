// =============================================================================
// Rate Limiting
// =============================================================================
// Limita o número de requisições por IP para prevenir abusos.
// Com REDIS_URL configurado, o contador é compartilhado entre as instâncias do
// PM2; sem ele (ou se o Redis cair), usa memória local por processo.
// =============================================================================

import Redis from 'ioredis'

interface RateLimitEntry {
  count: number
  resetTime: number
}

let redisClient: Redis | null | undefined

function getRedis(): Redis | null {
  if (redisClient === undefined) {
    const url = process.env.REDIS_URL
    redisClient = url ? new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false }) : null
    redisClient?.on('error', error => console.warn('Rate limit: Redis indisponível:', error.message))
  }
  return redisClient
}

// Fallback em memória
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
  // Envio de mensagens no chat: 20 por minuto
  chat: { limit: 20, windowMs: 60 * 1000 },
  // Upload de arquivos (comprovante): 10 por minuto
  upload: { limit: 10, windowMs: 60 * 1000 },
  // Envio de localização do motoboy: o app envia no máximo 1 a cada 5s
  localizacao: { limit: 30, windowMs: 60 * 1000 },
} as const

/**
 * Verifica rate limit para um identificador (geralmente IP)
 *
 * @param identifier - Identificador único (IP, userId, etc)
 * @param config - Configuração de rate limit
 * @returns Resultado com status e informações de limite
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.api
): Promise<RateLimitResult> {
  const redis = getRedis()
  if (redis?.status === 'ready') {
    try {
      const key = `ratelimit:${identifier}`
      const results = await redis.multi()
        .set(key, 0, 'PX', config.windowMs, 'NX')
        .incr(key)
        .pttl(key)
        .exec()
      if (results && !results.some(([error]) => error)) {
        const count = results[1][1] as number
        const ttl = Math.max(0, results[2][1] as number)
        return buildResult(count, config, Date.now() + ttl)
      }
    } catch (error) {
      console.warn('Rate limit: falha no Redis, usando memória local:', error)
    }
  }
  return checkMemoryRateLimit(identifier, config)
}

function checkMemoryRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  let entry = rateLimitStore.get(identifier)

  // Se não existe ou expirou, criar nova entrada
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + config.windowMs }
    rateLimitStore.set(identifier, entry)
  }

  entry.count++
  return buildResult(entry.count, config, entry.resetTime)
}

function buildResult(count: number, config: RateLimitConfig, resetTime: number): RateLimitResult {
  return {
    success: count <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
    resetTime,
  }
}

/**
 * Obtém o IP do cliente a partir do request.
 * Prioriza X-Real-IP, que o nginx/Traefik sobrescrevem com o IP da conexão.
 * Do X-Forwarded-For usa o último valor (adicionado pelo proxy): os primeiros
 * podem ser forjados pelo próprio cliente.
 */
export function getClientIP(request: Request): string {
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP.trim()

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(Boolean)
    if (ips.length) return ips[ips.length - 1]
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

/**
 * Estado do Redis para o healthcheck: sem REDIS_URL o app funciona com o
 * fallback em memória, então "nao_configurado" não deixa a instância indisponível.
 */
export async function verificarRedis(): Promise<'ok' | 'falhou' | 'nao_configurado'> {
  const redis = getRedis()
  if (!redis) return 'nao_configurado'
  if (redis.status !== 'ready') {
    // Primeira chamada do processo: dá 1s para a conexão inicial completar
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 1000)
      redis.once('ready', () => { clearTimeout(timer); resolve() })
    })
  }
  try {
    return (await redis.ping()) === 'PONG' ? 'ok' : 'falhou'
  } catch {
    return 'falhou'
  }
}
