// =============================================================================
// Helpers de Autorização e Rate Limiting
// =============================================================================
// Funções centralizadas para verificação de autenticação e autorização
// Use em todas as rotas de API para garantir segurança consistente
// =============================================================================

import { getServerSession } from 'next-auth'
import { NextResponse, NextRequest } from 'next/server'
import { authOptions } from './auth'
import {
  checkRateLimit,
  getClientIP,
  createRateLimitKey,
  getRateLimitHeaders,
  RateLimitConfig,
  RATE_LIMIT_CONFIGS,
} from './rate-limit'

// Tipos
export type UserRole = 'ADMIN' | 'CLIENTE' | 'MOTOBOY'

export interface AuthenticatedUser {
  id: string
  email: string
  name?: string | null
  role: UserRole
  motoboyId: string | null
  clienteId: string | null
}

export interface AuthResult {
  authenticated: true
  user: AuthenticatedUser
}

export interface AuthError {
  authenticated: false
  response: NextResponse
}

// =============================================================================
// Respostas de erro padronizadas
// =============================================================================

export function unauthorized(message = 'Autenticação necessária') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  )
}

export function forbidden(message = 'Acesso negado') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  )
}

export function notFound(message = 'Recurso não encontrado') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 404 }
  )
}

export function badRequest(message = 'Requisição inválida') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 400 }
  )
}

export function serverError(message = 'Erro interno do servidor') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 500 }
  )
}

// =============================================================================
// Verificação de autenticação
// =============================================================================

/**
 * Verifica se o usuário está autenticado
 * Use no início de todas as rotas de API que requerem login
 *
 * @example
 * const auth = await requireAuth()
 * if (!auth.authenticated) return auth.response
 * const { user } = auth
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      authenticated: false,
      response: unauthorized(),
    }
  }

  return {
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.name,
      role: session.user.role as UserRole,
      motoboyId: session.user.motoboyId,
      clienteId: session.user.clienteId,
    },
  }
}

// =============================================================================
// Verificação de papel (role)
// =============================================================================

/**
 * Verifica se o usuário tem um dos papéis permitidos
 *
 * @example
 * const auth = await requireRole(['ADMIN', 'CLIENTE'])
 * if (!auth.authenticated) return auth.response
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthResult | AuthError> {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth

  if (!allowedRoles.includes(auth.user.role)) {
    return {
      authenticated: false,
      response: forbidden(`Acesso restrito a: ${allowedRoles.join(', ')}`),
    }
  }

  return auth
}

/**
 * Verifica se o usuário é admin
 */
export async function requireAdmin(): Promise<AuthResult | AuthError> {
  return requireRole(['ADMIN'])
}

// =============================================================================
// Verificação de propriedade de recursos
// =============================================================================

/**
 * Verifica se o usuário é dono do recurso cliente
 * Admin sempre tem acesso
 *
 * @param clienteId - ID do cliente a verificar
 */
export async function requireClienteOwnership(
  clienteId: string
): Promise<AuthResult | AuthError> {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth

  // Admin tem acesso a tudo
  if (auth.user.role === 'ADMIN') return auth

  // Verifica se é o cliente correto
  if (auth.user.clienteId !== clienteId) {
    return {
      authenticated: false,
      response: forbidden('Você não tem permissão para acessar este recurso'),
    }
  }

  return auth
}

/**
 * Verifica se o usuário é dono do recurso motoboy
 * Admin sempre tem acesso
 *
 * @param motoboyId - ID do motoboy a verificar
 */
export async function requireMotoboyOwnership(
  motoboyId: string
): Promise<AuthResult | AuthError> {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth

  // Admin tem acesso a tudo
  if (auth.user.role === 'ADMIN') return auth

  // Verifica se é o motoboy correto
  if (auth.user.motoboyId !== motoboyId) {
    return {
      authenticated: false,
      response: forbidden('Você não tem permissão para acessar este recurso'),
    }
  }

  return auth
}

/**
 * Verifica se o usuário tem acesso a um pedido
 * - Cliente: só seus próprios pedidos
 * - Motoboy: pedidos atribuídos a ele
 * - Admin: todos os pedidos
 *
 * @param pedido - Objeto do pedido com clienteId e motoboyId
 */
export async function requirePedidoAccess(pedido: {
  clienteId: string
  motoboyId: string | null
}): Promise<AuthResult | AuthError> {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth

  // Admin tem acesso a tudo
  if (auth.user.role === 'ADMIN') return auth

  // Cliente só acessa seus pedidos
  if (auth.user.role === 'CLIENTE' && auth.user.clienteId === pedido.clienteId) {
    return auth
  }

  // Motoboy só acessa pedidos atribuídos a ele
  if (auth.user.role === 'MOTOBOY' && auth.user.motoboyId === pedido.motoboyId) {
    return auth
  }

  return {
    authenticated: false,
    response: forbidden('Você não tem permissão para acessar este pedido'),
  }
}

/**
 * Verifica se o usuário tem acesso a um endereço
 * - Admin ou dono do cliente
 *
 * @param endereco - Objeto do endereço com clienteId
 */
export async function requireEnderecoAccess(endereco: {
  clienteId: string
}): Promise<AuthResult | AuthError> {
  return requireClienteOwnership(endereco.clienteId)
}

// =============================================================================
// Helpers de verificação de papel
// =============================================================================

export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === 'ADMIN'
}

export function isCliente(user: AuthenticatedUser): boolean {
  return user.role === 'CLIENTE'
}

export function isMotoboy(user: AuthenticatedUser): boolean {
  return user.role === 'MOTOBOY'
}

// =============================================================================
// Utilitário para obter usuário ou null (para rotas opcionalmente autenticadas)
// =============================================================================

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name,
    role: session.user.role as UserRole,
    motoboyId: session.user.motoboyId,
    clienteId: session.user.clienteId,
  }
}

// =============================================================================
// Rate Limiting
// =============================================================================

export interface RateLimitError {
  success: false
  response: NextResponse
}

export interface RateLimitSuccess {
  success: true
}

/**
 * Verifica rate limit para uma requisição
 * Use no início das rotas de API para limitar requisições por IP
 *
 * @param request - NextRequest
 * @param config - Configuração de rate limit (opcional, usa 'api' por padrão)
 *
 * @example
 * const rateLimit = applyRateLimit(request, 'auth')
 * if (!rateLimit.success) return rateLimit.response
 */
export function applyRateLimit(
  request: NextRequest,
  configType: keyof typeof RATE_LIMIT_CONFIGS = 'api'
): RateLimitSuccess | RateLimitError {
  const ip = getClientIP(request)
  const endpoint = request.nextUrl.pathname
  const key = createRateLimitKey(ip, endpoint)
  const config = RATE_LIMIT_CONFIGS[configType]

  const result = checkRateLimit(key, config)

  if (!result.success) {
    const headers = getRateLimitHeaders(result)
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Muitas requisições. Tente novamente mais tarde.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers,
        }
      ),
    }
  }

  return { success: true }
}

// Re-export rate limit configs for direct use
export { RATE_LIMIT_CONFIGS }
