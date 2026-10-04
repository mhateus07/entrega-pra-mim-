import NextAuth from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { applyRateLimit } from '@/lib/auth-helpers'

const handler = NextAuth(authOptions)

type RouteContext = { params: Promise<{ nextauth: string[] }> }

// Limita tentativas de login por IP contra força bruta. A resposta mantém o
// formato { url } que o signIn() do next-auth espera para ler o erro.
async function POST(request: NextRequest, context: RouteContext) {
  if (request.nextUrl.pathname.endsWith('/callback/credentials')) {
    const rateLimit = await applyRateLimit(request, 'auth')
    if (!rateLimit.success) {
      const url = new URL('/login?error=TooManyRequests', request.nextUrl.origin)
      return NextResponse.json({ url: url.toString() }, { status: 429 })
    }
  }
  return handler(request, context)
}

export { handler as GET, POST }
