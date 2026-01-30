import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
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

export const config = {
  matcher: ['/dashboard/:path*', '/cliente/:path*', '/motoboy/:path*'],
}
