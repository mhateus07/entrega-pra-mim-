// =============================================================================
// Consumo mensal da central (UsageCounter) e limites do plano
// =============================================================================

import type { Prisma } from '@prisma/client'
import prisma from './prisma'
import { OperacaoError } from './operacao-error'
import { LIMITES_PLANO, situacaoEntregas } from './planos'

const FUSO_PADRAO = 'America/Sao_Paulo'

/** Mês de referência (AAAA-MM) no fuso da central. */
export function mesReferencia(data = new Date(), fuso = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit' }).format(data)
}

async function contextoPlano(organizationId: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { plano: true, settings: { select: { fusoHorario: true } } },
  })
  return { plano: org.plano, mes: mesReferencia(new Date(), org.settings?.fusoHorario ?? FUSO_PADRAO) }
}

export async function lerUso(organizationId: string) {
  const { plano, mes } = await contextoPlano(organizationId)
  const contador = await prisma.usageCounter.findUnique({
    where: { organizationId_mes: { organizationId, mes } },
    select: { entregas: true, chamadasMaps: true },
  })
  const motoboysAtivos = await prisma.motoboy.count({ where: { organizationId, aprovacao: 'APROVADO' } })
  return {
    plano, mes,
    limites: LIMITES_PLANO[plano],
    entregas: situacaoEntregas(plano, contador?.entregas ?? 0),
    chamadasMaps: contador?.chamadasMaps ?? 0,
    motoboys: { ativos: motoboysAtivos, limite: LIMITES_PLANO[plano].motoboys },
  }
}

/**
 * Conta uma entrega nova no mês. Chame dentro da transação que cria o pedido.
 * Recusa acima de 120% do limite; entre 100% e 120% aceita e devolve o aviso.
 */
export async function registrarEntrega(tx: Prisma.TransactionClient, organizationId: string) {
  const { plano, mes } = await contextoPlano(organizationId, tx)
  const atual = await tx.usageCounter.findUnique({ where: { organizationId_mes: { organizationId, mes } }, select: { entregas: true } })
  const antes = situacaoEntregas(plano, atual?.entregas ?? 0)
  if (antes.bloqueado) {
    throw new OperacaoError(
      `Limite do plano ${LIMITES_PLANO[plano].nome} atingido este mês (${antes.usadas} de ${antes.limite} entregas, tolerância de 20%). Fale com a equipe do Entrega Pra Mim para mudar de plano.`,
      403,
    )
  }
  const contador = await tx.usageCounter.upsert({
    where: { organizationId_mes: { organizationId, mes } },
    create: { organizationId, mes, entregas: 1 },
    update: { entregas: { increment: 1 } },
    select: { entregas: true },
  })
  const depois = situacaoEntregas(plano, contador.entregas)
  return depois.excedentes > 0
    ? `Sua central passou do limite de ${depois.limite} entregas do plano este mês (${depois.excedentes} excedente${depois.excedentes > 1 ? 's' : ''}).`
    : null
}

/** Conta uma chamada paga ao Google Maps. Melhor esforço: nunca derruba a operação. */
export async function registrarChamadaMaps(organizationId: string | undefined) {
  if (!organizationId) return
  try {
    const { mes } = await contextoPlano(organizationId)
    await prisma.usageCounter.upsert({
      where: { organizationId_mes: { organizationId, mes } },
      create: { organizationId, mes, chamadasMaps: 1 },
      update: { chamadasMaps: { increment: 1 } },
    })
  } catch (error) {
    console.warn('Uso: falha ao contar chamada do Maps', error)
  }
}

/**
 * Bloqueia novo motoboy (cadastro ou aprovação) acima do limite do plano.
 * @param contarPendentes no cadastro, pendentes também ocupam vaga
 */
export async function verificarLimiteMotoboys(organizationId: string, contarPendentes: boolean) {
  const { plano } = await contextoPlano(organizationId)
  const limite = LIMITES_PLANO[plano].motoboys
  const ocupadas = await prisma.motoboy.count({
    where: { organizationId, aprovacao: { in: contarPendentes ? ['APROVADO', 'PENDENTE_APROVACAO'] : ['APROVADO'] } },
  })
  if (ocupadas >= limite) {
    throw new OperacaoError(
      `O plano ${LIMITES_PLANO[plano].nome} permite até ${limite} motoboys ativos. Suspenda um cadastro ou mude de plano.`,
      403,
    )
  }
}
