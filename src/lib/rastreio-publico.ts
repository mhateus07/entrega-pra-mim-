// =============================================================================
// Rastreio público por link (/r/[token])
// =============================================================================
// O destinatário não tem conta. O link mostra apenas o necessário para acompanhar
// a entrega: status, horários, primeiro nome do motoboy, bairro/cidade e, só
// durante a entrega, a posição do motoboy e o ponto de destino. Nada de telefone,
// documento, valor ou endereço completo de terceiros.
// =============================================================================

import prisma from './prisma'
import { calcularDistanciaHaversine } from './google-maps'
import { TOKEN_VALIDO } from './tokens'

const VELOCIDADE_MEDIA_KMH = 20

export async function buscarPedidoPorToken(token: string) {
  if (!TOKEN_VALIDO.test(token)) return null
  return prisma.pedido.findUnique({
    where: { trackingToken: token },
    select: {
      id: true, status: true, tipoServico: true, createdAt: true, aceitoEm: true, coletadoEm: true, entregueEm: true, canceladoEm: true,
      duracaoEstimada: true, fotoComprovante: true,
      enderecoOrigem: { select: { bairro: true, cidade: true } },
      enderecoDestino: { select: { bairro: true, cidade: true, latitude: true, longitude: true } },
      motoboy: { select: { latitudeAtual: true, longitudeAtual: true, ultimaAtividade: true, user: { select: { nome: true } } } },
      organization: { select: { nome: true, slug: true, plano: true, settings: { select: { nomeExibicao: true, corPrimaria: true, logoArquivo: true } } } },
    },
  })
}

export function montarRastreioPublico(pedido: NonNullable<Awaited<ReturnType<typeof buscarPedidoPorToken>>>, token: string) {
  const emEntrega = pedido.status === 'EM_ENTREGA'
  const destino = pedido.enderecoDestino
  const m = pedido.motoboy
  const posicao = emEntrega && m?.latitudeAtual != null && m.longitudeAtual != null
    ? { latitude: m.latitudeAtual, longitude: m.longitudeAtual, atualizadoEm: m.ultimaAtividade }
    : null

  // ETA aproximado pela distância em linha reta (o ETA real pela rota é fase 2)
  let etaMinutos: number | null = null
  if (emEntrega && posicao && destino.latitude != null && destino.longitude != null) {
    const km = calcularDistanciaHaversine(posicao, { latitude: destino.latitude, longitude: destino.longitude })
    etaMinutos = Math.max(1, Math.round((km / VELOCIDADE_MEDIA_KMH) * 60) + 2)
  } else if (pedido.status === 'EM_COLETA' || pedido.status === 'ACEITO') {
    etaMinutos = pedido.duracaoEstimada
  }

  const settings = pedido.organization.settings
  const marcaPropria = pedido.organization.plano === 'MARCA_PROPRIA'
  return {
    status: pedido.status,
    tipoServico: pedido.tipoServico,
    horarios: { criado: pedido.createdAt, aceito: pedido.aceitoEm, coletado: pedido.coletadoEm, entregue: pedido.entregueEm, cancelado: pedido.canceladoEm },
    origem: { bairro: pedido.enderecoOrigem.bairro, cidade: pedido.enderecoOrigem.cidade },
    destino: {
      bairro: destino.bairro, cidade: destino.cidade,
      // Ponto do destino só durante a entrega, para o mapa
      ...(emEntrega && destino.latitude != null && destino.longitude != null ? { latitude: destino.latitude, longitude: destino.longitude } : {}),
    },
    motoboy: m ? { nome: m.user.nome.trim().split(/\s+/)[0] } : null,
    posicao,
    etaMinutos,
    etaAproximado: true,
    comprovanteUrl: pedido.status === 'ENTREGUE' && pedido.fotoComprovante ? `/api/publico/rastreio/${token}/comprovante` : null,
    central: {
      nome: (marcaPropria && settings?.nomeExibicao) || pedido.organization.nome,
      slug: pedido.organization.slug,
      // Logo e cor só no plano Marca própria (Etapa 5); nos outros aparece a marca do EPM
      corPrimaria: marcaPropria ? settings?.corPrimaria ?? null : null,
      logoUrl: marcaPropria && settings?.logoArquivo ? `/api/publico/organizacoes/${pedido.organization.slug}/logo` : null,
    },
    atualizadoEm: new Date().toISOString(),
  }
}
