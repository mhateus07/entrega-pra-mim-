// =============================================================================
// Trilha de auditoria
// =============================================================================
// Registra quem fez o quê em ações sensíveis. É "melhor esforço": uma falha ao
// gravar o log não pode derrubar a operação de negócio, então o erro só é
// reportado no console. Nunca coloque senha, CVV ou número de cartão em `dados`.
// =============================================================================

import type { Prisma } from '@prisma/client'
import prisma from './prisma'
import { getClientIP } from './rate-limit'

export type AcaoAuditoria =
  | 'auth.login'
  | 'auth.login_falhou'
  | 'motoboy.cadastro'
  | 'motoboy.aprovacao'
  | 'motoboy.excluido'
  | 'pedido.criado'
  | 'pedido.status'
  | 'pagamento.criado'
  | 'pagamento.acao'
  | 'pagamento.cancelado'
  | 'comprovante.enviado'
  | 'comprovante.acessado'

export interface EntradaAuditoria {
  acao: AcaoAuditoria
  entidade: string
  entidadeId?: string | null
  userId?: string | null
  dados?: Prisma.InputJsonValue
  request?: Request | null
  ip?: string | null
}

export async function registrarAuditoria(entrada: EntradaAuditoria): Promise<void> {
  try {
    const ip = entrada.ip ?? (entrada.request ? getClientIP(entrada.request) : null)
    await prisma.auditLog.create({
      data: {
        acao: entrada.acao,
        entidade: entrada.entidade,
        entidadeId: entrada.entidadeId ?? null,
        userId: entrada.userId ?? null,
        dados: entrada.dados,
        ip: ip && ip !== 'unknown' ? ip.slice(0, 64) : null,
      },
    })
  } catch (error) {
    console.error('Auditoria: falha ao registrar', entrada.acao, error)
  }
}
