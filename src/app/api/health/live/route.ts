import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/health/live - O processo está de pé (não consulta dependências).
// Use no healthcheck do container: falha aqui significa reiniciar.
export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
}
