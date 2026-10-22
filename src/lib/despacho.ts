// =============================================================================
// Despacho com oferta
// =============================================================================
// O sistema oferece a corrida ao melhor motoboy (score de src/lib/alocacao.ts).
// Se ele não aceitar dentro do prazo da central (padrão 90 s) ou recusar, a
// corrida vai para o próximo. Após N tentativas (padrão 3) — ou se não houver
// motoboy online — o pedido cai na fila manual do despachante.
//
// Há no máximo uma oferta OFERTADA por pedido. O aceite usa o mesmo lock de
// pedido das demais mutações (comPedidoBloqueado) e a reserva atômica do
// motoboy, então duas respostas simultâneas nunca atribuem o pedido duas vezes.
// =============================================================================

import prisma from './prisma'
import { comPedidoBloqueado } from './pedido-transaction'
import { encontrarMelhorMotoboy } from './alocacao'
import { encerrarOfertas, reservarMotoboy } from './pedido-status'
import { OperacaoError } from './operacao-error'
import type { OrgUser } from './auth-helpers'

// Entrega agendada só entra no despacho perto do horário marcado
const JANELA_AGENDADA_MS = 30 * 60 * 1000

export type ResultadoOferta =
  | { tipo: 'ofertado'; ofertaId: string; motoboyId: string; expiresAt: Date }
  | { tipo: 'manual'; motivo: 'tentativas' | 'sem_motoboy' }
  | { tipo: 'ignorado'; motivo: string }

/** Faz a próxima oferta do pedido (ou o manda para a fila manual). Idempotente. */
export async function ofertarPedido(pedidoId: string): Promise<ResultadoOferta> {
  return comPedidoBloqueado(pedidoId, async tx => {
    const agora = new Date()
    const pedido = await tx.pedido.findUniqueOrThrow({
      where: { id: pedidoId },
      select: {
        id: true, organizationId: true, status: true, motoboyId: true, despachoManual: true, tentativasDespacho: true,
        tipoServico: true, dataAgendada: true, enderecoOrigem: { select: { latitude: true, longitude: true } },
      },
    })
    if (pedido.status !== 'SOLICITADO' || pedido.motoboyId) return { tipo: 'ignorado', motivo: 'pedido já atribuído ou encerrado' }
    if (pedido.despachoManual) return { tipo: 'ignorado', motivo: 'na fila manual' }
    if (pedido.tipoServico === 'AGENDADA' && pedido.dataAgendada && pedido.dataAgendada.getTime() - agora.getTime() > JANELA_AGENDADA_MS) {
      return { tipo: 'ignorado', motivo: 'agendado para mais tarde' }
    }

    const aberta = await tx.dispatchOffer.findFirst({ where: { pedidoId, status: 'OFERTADA' } })
    if (aberta && aberta.expiresAt > agora) return { tipo: 'ignorado', motivo: 'oferta em aberto' }
    if (aberta) await tx.dispatchOffer.update({ where: { id: aberta.id }, data: { status: 'EXPIRADA', respondidaEm: agora } })

    const config = await tx.organizationSettings.findUnique({
      where: { organizationId: pedido.organizationId }, select: { despachoTtlSegundos: true, despachoMaxTentativas: true },
    })
    const ttl = config?.despachoTtlSegundos ?? 90
    const maxTentativas = config?.despachoMaxTentativas ?? 3

    const paraFilaManual = async (motivo: 'tentativas' | 'sem_motoboy'): Promise<ResultadoOferta> => {
      await tx.pedido.update({ where: { id: pedidoId }, data: { despachoManual: true } })
      return { tipo: 'manual', motivo }
    }
    if (pedido.tentativasDespacho >= maxTentativas) return paraFilaManual('tentativas')
    const { latitude, longitude } = pedido.enderecoOrigem
    if (latitude == null || longitude == null) return paraFilaManual('sem_motoboy')

    // Não repete motoboy no mesmo ciclo nem oferece a quem já tem outra oferta aberta
    const ciclo = pedido.tentativasDespacho > 0
      ? await tx.dispatchOffer.findMany({ where: { pedidoId }, orderBy: { createdAt: 'desc' }, take: pedido.tentativasDespacho, select: { motoboyId: true } })
      : []
    const ocupados = await tx.dispatchOffer.findMany({
      where: { organizationId: pedido.organizationId, status: 'OFERTADA', expiresAt: { gt: agora } }, select: { motoboyId: true },
    })
    const candidatos = await tx.motoboy.findMany({
      where: {
        organizationId: pedido.organizationId, status: 'DISPONIVEL', aprovacao: 'APROVADO',
        localizacaoEm: { gte: new Date(agora.getTime() - 120_000) },
        id: { notIn: [...ciclo, ...ocupados].map(o => o.motoboyId) },
      },
      select: { id: true, latitudeAtual: true, longitudeAtual: true, avaliacaoMedia: true, ultimaAtividade: true, disponivelDesde: true, status: true },
    })
    // Estar online é a disponibilidade que vale aqui (a escala de horário é opcional)
    const melhor = encontrarMelhorMotoboy(candidatos, { latitude, longitude }, false)
    if (!melhor) return paraFilaManual('sem_motoboy')

    const oferta = await tx.dispatchOffer.create({
      data: {
        organizationId: pedido.organizationId, pedidoId, motoboyId: melhor.motoboyId,
        tentativa: pedido.tentativasDespacho + 1, expiresAt: new Date(agora.getTime() + ttl * 1000),
      },
    })
    await tx.pedido.update({ where: { id: pedidoId }, data: { tentativasDespacho: { increment: 1 } } })
    return { tipo: 'ofertado', ofertaId: oferta.id, motoboyId: oferta.motoboyId, expiresAt: oferta.expiresAt }
  })
}

/** O motoboy aceita a oferta: atribui o pedido a ele (só uma resposta vence). */
export async function aceitarOferta(ofertaId: string, user: OrgUser) {
  const oferta = await prisma.dispatchOffer.findFirst({
    where: { id: ofertaId, organizationId: user.organizationId, motoboyId: user.motoboyId ?? '__nenhum__' },
    select: { pedidoId: true },
  })
  if (!oferta || !user.motoboyId) throw new OperacaoError('Oferta não encontrada', 404)
  const motoboyId = user.motoboyId

  return comPedidoBloqueado(oferta.pedidoId, async tx => {
    const agora = new Date()
    const marcada = await tx.dispatchOffer.updateMany({
      where: { id: ofertaId, status: 'OFERTADA', expiresAt: { gt: agora } },
      data: { status: 'ACEITA', respondidaEm: agora },
    })
    if (marcada.count !== 1) throw new OperacaoError('Esta oferta não está mais disponível')
    const pedido = await tx.pedido.findUniqueOrThrow({ where: { id: oferta.pedidoId }, select: { status: true, motoboyId: true } })
    if (pedido.status !== 'SOLICITADO' || pedido.motoboyId) throw new OperacaoError('Este pedido já foi atribuído')
    await reservarMotoboy(tx, user.organizationId, motoboyId)
    await encerrarOfertas(tx, oferta.pedidoId)
    await tx.pedidoEvento.create({ data: { pedidoId: oferta.pedidoId, organizationId: user.organizationId, userId: user.id, descricao: 'Oferta aceita pelo entregador' } })
    return tx.pedido.update({
      where: { id: oferta.pedidoId },
      data: { status: 'ACEITO', motoboyId, aceitoEm: agora, despachoManual: false },
      select: { id: true, status: true, motoboyId: true },
    })
  })
}

/** O motoboy recusa: a corrida vai para o próximo do score. */
export async function recusarOferta(ofertaId: string, user: OrgUser) {
  const oferta = await prisma.dispatchOffer.findFirst({
    where: { id: ofertaId, organizationId: user.organizationId, motoboyId: user.motoboyId ?? '__nenhum__' },
    select: { pedidoId: true },
  })
  if (!oferta) throw new OperacaoError('Oferta não encontrada', 404)
  const recusada = await prisma.dispatchOffer.updateMany({
    where: { id: ofertaId, status: 'OFERTADA' }, data: { status: 'RECUSADA', respondidaEm: new Date() },
  })
  if (recusada.count !== 1) throw new OperacaoError('Esta oferta não está mais disponível')
  return ofertarPedido(oferta.pedidoId)
}

/** Despachante devolve o pedido ao despacho automático (novo ciclo de tentativas). */
export async function reofertarPedido(pedidoId: string, organizationId: string) {
  const reiniciado = await prisma.pedido.updateMany({
    where: { id: pedidoId, organizationId, status: 'SOLICITADO', motoboyId: null },
    data: { despachoManual: false, tentativasDespacho: 0 },
  })
  if (reiniciado.count !== 1) throw new OperacaoError('Pedido não está aguardando motoboy', 404)
  return ofertarPedido(pedidoId)
}

/**
 * Varredura do job: expira ofertas vencidas e oferece os pedidos sem oferta
 * em aberto. Seguro para rodar em paralelo (cada pedido é bloqueado).
 */
export async function processarDespacho(limite = 200) {
  const agora = new Date()
  const [vencidas, semOferta] = await Promise.all([
    prisma.dispatchOffer.findMany({ where: { status: 'OFERTADA', expiresAt: { lte: agora } }, select: { pedidoId: true }, take: limite }),
    prisma.pedido.findMany({
      where: { status: 'SOLICITADO', motoboyId: null, despachoManual: false, ofertas: { none: { status: 'OFERTADA' } } },
      select: { id: true }, take: limite,
    }),
  ])
  const pedidos = [...new Set([...vencidas.map(o => o.pedidoId), ...semOferta.map(p => p.id)])]
  const resumo = { processados: 0, ofertados: 0, filaManual: 0, erros: 0 }
  for (const id of pedidos) {
    try {
      const r = await ofertarPedido(id)
      resumo.processados++
      if (r.tipo === 'ofertado') resumo.ofertados++
      if (r.tipo === 'manual') resumo.filaManual++
    } catch (error) {
      resumo.erros++
      console.error('Despacho: falha no pedido', id, error)
    }
  }
  return resumo
}
