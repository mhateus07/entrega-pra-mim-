// Endpoints de API acessíveis sem login: NextAuth, healthchecks e /api/publico/*
// (rastreio por link, convite e "criar minha central"; cada um tem rate limit por IP).
export function isPublicApi(method: string, path: string): boolean {
  if (path === '/api/auth' || path.startsWith('/api/auth/')) return true
  if (method === 'GET' && (path === '/api/health/live' || path === '/api/health/ready')) return true
  return (method === 'GET' || method === 'POST') && path.startsWith('/api/publico/')
}
