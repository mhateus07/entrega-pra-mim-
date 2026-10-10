// Endpoints de API acessíveis sem login: NextAuth, healthchecks e cadastro de cliente/motoboy.
export function isPublicApi(method: string, path: string): boolean {
  if (path === '/api/auth' || path.startsWith('/api/auth/')) return true
  if (method === 'GET' && (path === '/api/health/live' || path === '/api/health/ready')) return true
  return method === 'POST' && (path === '/api/clientes' || path === '/api/motoboys')
}
