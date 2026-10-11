import prisma from './prisma'
import { REGRA_PADRAO, type RegraPreco } from './pricing'

/** Tabela de preço da central (padrão se ela ainda não configurou). */
export async function carregarRegraPreco(organizationId: string): Promise<RegraPreco> {
  const [regra, bairros] = await Promise.all([
    prisma.pricingRule.findUnique({ where: { organizationId } }),
    prisma.pricingBairro.findMany({ where: { organizationId }, select: { bairro: true, valor: true } }),
  ])
  return {
    precoPorKm: regra ? regra.precoPorKm.toNumber() : REGRA_PADRAO.precoPorKm,
    valorMinimo: regra ? regra.valorMinimo.toNumber() : REGRA_PADRAO.valorMinimo,
    multiplicadores: regra
      ? { AGENDADA: regra.multAgendada.toNumber(), DOCUMENTOS: regra.multDocumentos.toNumber(), EXPRESSA: regra.multExpressa.toNumber() }
      : REGRA_PADRAO.multiplicadores,
    bairros: Object.fromEntries(bairros.map(b => [b.bairro, b.valor.toNumber()])),
  }
}
