import { createHash, randomBytes } from 'crypto'

// Tokens de link (rastreio público e convite): 32 bytes aleatórios em base64url = 43 caracteres
export function gerarToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export const TOKEN_VALIDO = /^[A-Za-z0-9_-]{32,64}$/

/** URL absoluta da aplicação para montar links compartilháveis. */
export function urlBase(): string {
  return (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
}
