import { NextResponse } from 'next/server'
import { access, mkdir } from 'fs/promises'
import { constants } from 'fs'
import prisma from '@/lib/prisma'
import { verificarRedis } from '@/lib/rate-limit'
import { COMPROVANTE_DIR } from '@/lib/comprovante-storage'

export const dynamic = 'force-dynamic'

type Estado = 'ok' | 'falhou' | 'nao_configurado'

async function comPrazo(checagem: Promise<Estado>, ms = 3000): Promise<Estado> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const prazo = new Promise<Estado>(resolve => { timer = setTimeout(() => resolve('falhou'), ms) })
  try {
    return await Promise.race([checagem.catch((): Estado => 'falhou'), prazo])
  } finally {
    clearTimeout(timer)
  }
}

async function verificarBanco(): Promise<Estado> {
  await prisma.$queryRaw`SELECT 1`
  return 'ok'
}

async function verificarStorage(): Promise<Estado> {
  await mkdir(COMPROVANTE_DIR, { recursive: true })
  await access(COMPROVANTE_DIR, constants.W_OK)
  return 'ok'
}

// GET /api/health/ready - A instância consegue atender: banco, Redis e storage.
// Responde 503 se alguma dependência configurada falhar. Não expõe mensagens de erro.
export async function GET() {
  const [banco, redis, storage] = await Promise.all([
    comPrazo(verificarBanco()),
    comPrazo(verificarRedis()),
    comPrazo(verificarStorage()),
  ])
  const checks = { banco, redis, storage }
  const pronto = Object.values(checks).every(estado => estado !== 'falhou')
  return NextResponse.json(
    { status: pronto ? 'ok' : 'indisponivel', checks },
    { status: pronto ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
