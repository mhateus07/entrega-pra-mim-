import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { processarDespacho } from '@/lib/despacho'

function autorizado(request: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET
  const enviado = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!segredo || segredo.length < 24) return false
  const a = Buffer.from(enviado)
  const b = Buffer.from(segredo)
  return a.length === b.length && timingSafeEqual(a, b)
}

// POST /api/jobs/despacho - Expira ofertas vencidas e faz as próximas ofertas.
// Chamada a cada ~15 s pelo serviço "despacho-cron" do docker-compose, com
// Authorization: Bearer CRON_SECRET. Sem CRON_SECRET configurado, fica desligada.
export async function POST(request: NextRequest) {
  if (!autorizado(request)) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  try {
    return NextResponse.json({ success: true, data: await processarDespacho() })
  } catch (error) {
    console.error('Erro no job de despacho:', error)
    return NextResponse.json({ success: false, error: 'Erro no despacho' }, { status: 500 })
  }
}
