// =============================================================================
// Idempotência de POSTs sensíveis
// =============================================================================
// Quando o cliente envia o header `Idempotency-Key`, a primeira resposta
// (2xx/4xx) fica guardada por usuário + escopo + chave. Uma repetição com o
// mesmo corpo devolve a resposta original sem executar a operação de novo;
// com corpo diferente, é rejeitada. Respostas 5xx não são guardadas, para que
// o cliente possa tentar novamente com a mesma chave.
// Sem o header, a rota funciona como antes (compatibilidade com clientes antigos).
// =============================================================================

import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import prisma from './prisma'

const HEADER = 'idempotency-key'
const CHAVE_VALIDA = /^[A-Za-z0-9_:.-]{8,255}$/
const VALIDADE_MS = 24 * 60 * 60 * 1000

function erro(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status })
}

function hashCorpo(corpo: unknown): string {
  return createHash('sha256').update(JSON.stringify(corpo ?? null)).digest('hex')
}

export async function comIdempotencia(
  request: Request,
  userId: string,
  escopo: string,
  corpo: unknown,
  executar: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const chave = request.headers.get(HEADER)
  if (chave === null) return executar()
  if (!CHAVE_VALIDA.test(chave)) {
    return erro(400, 'Idempotency-Key inválida: use de 8 a 255 caracteres [A-Za-z0-9_:.-]')
  }

  const requestHash = hashCorpo(corpo)
  const where = { userId_escopo_chave: { userId, escopo, chave } }

  let registroId: string
  try {
    registroId = (await prisma.idempotencyKey.create({
      data: { userId, escopo, chave, requestHash },
      select: { id: true },
    })).id
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
    const existente = await prisma.idempotencyKey.findUnique({ where })
    if (!existente) return erro(409, 'Requisição em processamento. Tente novamente.')
    if (Date.now() - existente.createdAt.getTime() > VALIDADE_MS) {
      // Chave expirada: libera e reprocessa como se fosse nova
      await prisma.idempotencyKey.deleteMany({ where: { id: existente.id } })
      return comIdempotencia(request, userId, escopo, corpo, executar)
    }
    if (existente.requestHash !== requestHash) {
      return erro(422, 'Idempotency-Key já usada com outro conteúdo')
    }
    if (existente.statusCode === null || existente.resposta === null) {
      return erro(409, 'Requisição original ainda em processamento')
    }
    return new NextResponse(existente.resposta, {
      status: existente.statusCode,
      headers: { 'Content-Type': 'application/json', 'Idempotent-Replayed': 'true' },
    })
  }

  let resposta: NextResponse
  try {
    resposta = await executar()
  } catch (error) {
    await prisma.idempotencyKey.deleteMany({ where: { id: registroId } })
    throw error
  }

  if (resposta.status >= 500) {
    await prisma.idempotencyKey.deleteMany({ where: { id: registroId } })
  } else {
    await prisma.idempotencyKey.update({
      where: { id: registroId },
      data: { statusCode: resposta.status, resposta: await resposta.clone().text() },
    })
  }

  // Limpeza oportunista de chaves vencidas, sem bloquear a resposta
  if (Math.random() < 0.01) {
    prisma.idempotencyKey.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - VALIDADE_MS) } } })
      .catch(error => console.warn('Idempotência: falha na limpeza', error))
  }

  return resposta
}

