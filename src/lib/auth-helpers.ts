// =============================================================================
// Helpers de Autorização e Rate Limiting
// =============================================================================
// Toda leitura e escrita de negócio acontece dentro da organização (central)
// ativa da sessão. Use requireOrgAccess (ou os atalhos abaixo) no início das
// rotas e filtre as queries por user.organizationId.
// =============================================================================

import { getServerSession } from 'next-auth'
import { NextResponse, NextRequest } from 'next/server'
import { authOptions } from './auth'
import prisma from './prisma'
import {
  checkRateLimit,
  getClientIP,
  createRateLimitKey,
  getRateLimitHeaders,
  RATE_LIMIT_CONFIGS,
} from './rate-limit'

// Tipos
export type OrgRole = 'OWNER' | 'DISPATCHER' | 'CLIENT' | 'DRIVER'

export interface AuthenticatedUser {
  id: string
  email: string
  name?: string | null
  superadmin: boolean
  organizationId: string | null
  orgRole: OrgRole | null
  motoboyId: string | null
  clienteId: string | null
}

/** Usuário com organização ativa: o tipo que as rotas de negócio recebem. */
export interface OrgUser extends AuthenticatedUser {
  organizationId: string
  orgRole: OrgRole
}

export interface AuthResult<U = AuthenticatedUser> {
  authenticated: true
  user: U
}

export interface AuthError {
  authenticated: false
  response: NextResponse
}

export const PAPEIS_GESTAO: OrgRole[] = ['OWNER', 'DISPATCHER']

// =============================================================================
// Respostas de erro padronizadas
// =============================================================================

export function unauthorized(message = 'Autenticação necessária') {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

export function forbidden(message = 'Acesso negado') {
  return NextResponse.json({ success: false, error: message }, { status: 403 })
}

export function notFound(message = 'Recurso não encontrado') {
  return NextResponse.json({ success: false, error: message }, { status: 404 })
}

export function badRequest(message = 'Requisição inválida') {
  return NextResponse.json({ success: false, error: message }, { status: 400 })
}

export function serverError(message = 'Erro interno do servidor') {
  return NextResponse.json({ success: false, error: message }, { status: 500 })
}

function negar(response: NextResponse): AuthError {
  return { authenticated: false, response }
}

// =============================================================================
// Sessão
// =============================================================================

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions)
  // Sessão sem id = usuário removido (ver callback jwt em auth.ts)
  if (!session?.user?.id) return null
  return {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name,
    superadmin: !!session.user.superadmin,
    organizationId: session.user.activeOrganizationId ?? null,
    orgRole: session.user.orgRole ?? null,
    motoboyId: session.user.motoboyId ?? null,
    clienteId: session.user.clienteId ?? null,
  }
}

/** Exige login, sem exigir organização (seletor de central, perfil). */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const user = await getAuthenticatedUser()
  return user ? { authenticated: true, user } : negar(unauthorized())
}

export async function requireSuperadmin(): Promise<AuthResult | AuthError> {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth
  return auth.user.superadmin ? auth : negar(forbidden('Acesso restrito à equipe da plataforma'))
}

/**
 * Exige login, organização ativa e (opcionalmente) um dos papéis informados.
 * Central pendente ou suspensa só é acessível ao superadmin.
 *
 * @example
 * const auth = await requireOrgAccess(['OWNER', 'DISPATCHER'])
 * if (!auth.authenticated) return auth.response
 * prisma.pedido.findMany({ where: { organizationId: auth.user.organizationId } })
 */
export async function requireOrgAccess(papeis?: OrgRole[]): Promise<AuthResult<OrgUser> | AuthError> {
  const session = await getServerSession(authOptions)
  const user = session?.user?.id ? await getAuthenticatedUser() : null
  if (!user) return negar(unauthorized())
  if (!user.organizationId || !user.orgRole) return negar(forbidden('Selecione uma central para continuar'))
  if (!user.superadmin && session?.user?.orgStatus !== 'ATIVA') {
    return negar(forbidden(session?.user?.orgStatus === 'PENDENTE'
      ? 'Sua central está aguardando ativação pela equipe do Entrega Pra Mim'
      : 'Esta central está suspensa'))
  }
  if (papeis && !papeis.includes(user.orgRole)) {
    return negar(forbidden('Você não tem permissão para esta ação nesta central'))
  }
  return { authenticated: true, user: user as OrgUser }
}

/** Dono ou despachante da central ativa. */
export function requireGestor() {
  return requireOrgAccess(PAPEIS_GESTAO)
}

/** Apenas o dono da central ativa. */
export function requireOwner() {
  return requireOrgAccess(['OWNER'])
}

export function isGestor(user: Pick<AuthenticatedUser, 'orgRole'>): boolean {
  return user.orgRole === 'OWNER' || user.orgRole === 'DISPATCHER'
}

// =============================================================================
// Posse de recursos (sempre dentro da organização ativa)
// =============================================================================

/**
 * Cliente (empresa atendida): o próprio cliente ou a gestão da central,
 * desde que o cliente pertença à organização ativa.
 */
export async function requireClienteOwnership(clienteId: string): Promise<AuthResult<OrgUser> | AuthError> {
  const auth = await requireOrgAccess()
  if (!auth.authenticated) return auth
  const { user } = auth
  if (user.clienteId === clienteId) return auth
  if (isGestor(user)) {
    const existe = await prisma.cliente.findFirst({ where: { id: clienteId, organizationId: user.organizationId }, select: { id: true } })
    if (existe) return auth
    return negar(notFound('Cliente não encontrado'))
  }
  return negar(forbidden('Você não tem permissão para acessar este recurso'))
}

/** Motoboy: o próprio motoboy ou a gestão da central, dentro da organização ativa. */
export async function requireMotoboyOwnership(motoboyId: string): Promise<AuthResult<OrgUser> | AuthError> {
  const auth = await requireOrgAccess()
  if (!auth.authenticated) return auth
  const { user } = auth
  if (user.motoboyId === motoboyId) return auth
  if (isGestor(user)) {
    const existe = await prisma.motoboy.findFirst({ where: { id: motoboyId, organizationId: user.organizationId }, select: { id: true } })
    if (existe) return auth
    return negar(notFound('Motoboy não encontrado'))
  }
  return negar(forbidden('Você não tem permissão para acessar este recurso'))
}

/**
 * Pedido: gestão da central, cliente dono ou motoboy atribuído.
 * Pedido de outra organização responde 404, sem revelar que existe.
 */
export async function requirePedidoAccess(pedido: {
  organizationId: string
  clienteId: string
  motoboyId: string | null
}): Promise<AuthResult<OrgUser> | AuthError> {
  const auth = await requireOrgAccess()
  if (!auth.authenticated) return auth
  const { user } = auth
  if (pedido.organizationId !== user.organizationId) return negar(notFound('Pedido não encontrado'))
  if (isGestor(user)) return auth
  if (user.orgRole === 'CLIENT' && user.clienteId === pedido.clienteId) return auth
  if (user.orgRole === 'DRIVER' && !!user.motoboyId && user.motoboyId === pedido.motoboyId) return auth
  return negar(forbidden('Você não tem permissão para acessar este pedido'))
}

export async function requireEnderecoAccess(endereco: { clienteId: string }): Promise<AuthResult<OrgUser> | AuthError> {
  return requireClienteOwnership(endereco.clienteId)
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
 * Com `userId`, o limite é aplicado também por usuário: trocar de IP não
 * libera novas requisições e vários usuários atrás do mesmo NAT não se bloqueiam.
 *
 * @param request - NextRequest
 * @param config - Configuração de rate limit (opcional, usa 'api' por padrão)
 * @param userId - Usuário autenticado (opcional)
 *
 * @example
 * const rateLimit = await applyRateLimit(request, 'auth')
 * if (!rateLimit.success) return rateLimit.response
 */
export async function applyRateLimit(
  request: NextRequest,
  configType: keyof typeof RATE_LIMIT_CONFIGS = 'api',
  userId?: string
): Promise<RateLimitSuccess | RateLimitError> {
  const endpoint = request.nextUrl.pathname
  const config = RATE_LIMIT_CONFIGS[configType]
  const identificador = userId ? `user:${userId}` : getClientIP(request)

  const result = await checkRateLimit(createRateLimitKey(identificador, endpoint), config)
  return result.success ? { success: true } : { success: false, response: tooManyRequests(result) }
}

/**
 * Limita chamadas que consomem cota paga do Google Maps (rota e geocodificação):
 * 20 por minuto e 300 por dia por usuário, somando todos os endpoints.
 */
export async function applyMapsRateLimit(userId: string): Promise<RateLimitSuccess | RateLimitError> {
  for (const config of [RATE_LIMIT_CONFIGS.maps, RATE_LIMIT_CONFIGS.mapsDia]) {
    const result = await checkRateLimit(`maps:${config.windowMs}:user:${userId}`, config)
    if (!result.success) return { success: false, response: tooManyRequests(result) }
  }
  return { success: true }
}

function tooManyRequests(result: Awaited<ReturnType<typeof checkRateLimit>>) {
  return NextResponse.json(
    {
      success: false,
      error: 'Muitas requisições. Tente novamente mais tarde.',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    },
    { status: 429, headers: getRateLimitHeaders(result) }
  )
}

// Re-export rate limit configs for direct use
export { RATE_LIMIT_CONFIGS }
