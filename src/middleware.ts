import { withAuth } from 'next-auth/middleware'
import { getToken } from 'next-auth/jwt'
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import { isPublicApi } from '@/lib/public-api'

const pageMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Rotas protegidas por role
    if (path.startsWith('/dashboard') && token?.role !== 'ADMIN') {
      // Redirecionar não-admins para suas áreas específicas
      if (token?.role === 'CLIENTE') {
        return NextResponse.redirect(new URL('/cliente', req.url))
      }
      if (token?.role === 'MOTOBOY') {
        return NextResponse.redirect(new URL('/motoboy', req.url))
      }
    }

    if (path.startsWith('/cliente') && token?.role !== 'CLIENTE' && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    if (path.startsWith('/motoboy') && token?.role !== 'MOTOBOY' && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Camada extra: cada rota continua verificando permissão, mas uma rota nova
// que esqueça a checagem não fica exposta a visitantes anônimos.
export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const path = req.nextUrl.pathname
  if (path.startsWith('/api')) {
    if (isPublicApi(req.method, path)) return NextResponse.next()
    const token = await getToken({ req })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Autenticação necessária' }, { status: 401 })
    }
    return NextResponse.next()
  }
  return pageMiddleware(req as Parameters<typeof pageMiddleware>[0], event)
}

export const config = {
  matcher: ['/dashboard/:path*', '/cliente/:path*', '/motoboy/:path*', '/api/:path*'],
}
