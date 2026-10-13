import { withAuth } from 'next-auth/middleware'
import { getToken } from 'next-auth/jwt'
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import { isPublicApi } from '@/lib/public-api'

// Área de cada papel na central ativa: gestão → /dashboard, cliente → /cliente, motoboy → /motoboy
function areaDoToken(token: { orgRole?: string | null; superadmin?: boolean } | null): string {
  if (token?.orgRole === 'OWNER' || token?.orgRole === 'DISPATCHER') return '/dashboard'
  if (token?.orgRole === 'DRIVER') return '/motoboy'
  if (token?.orgRole === 'CLIENT') return '/cliente'
  return token?.superadmin ? '/dashboard' : '/login'
}

const pageMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    const area = areaDoToken(token)

    // O superadmin acessa qualquer área para dar suporte à central selecionada
    if (token?.superadmin) return NextResponse.next()

    for (const prefixo of ['/dashboard', '/cliente', '/motoboy']) {
      if (path.startsWith(prefixo) && area !== prefixo) {
        return NextResponse.redirect(new URL(area, req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token?.id,
    },
  }
)

// Camada extra: cada rota continua verificando permissão, mas uma rota nova
// que esqueça a checagem não fica exposta a visitantes anônimos.
export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  const path = req.nextUrl.pathname
  if (path.startsWith('/api')) {
    if (isPublicApi(req.method, path)) return NextResponse.next()
    const token = await getToken({ req })
    if (!token?.id) {
      return NextResponse.json({ success: false, error: 'Autenticação necessária' }, { status: 401 })
    }
    return NextResponse.next()
  }
  return pageMiddleware(req as Parameters<typeof pageMiddleware>[0], event)
}

export const config = {
  matcher: ['/dashboard/:path*', '/cliente/:path*', '/motoboy/:path*', '/api/:path*'],
}
