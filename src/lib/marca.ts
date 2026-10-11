// =============================================================================
// Marca da central (white-label) — recurso do plano MARCA_PROPRIA
// =============================================================================
// Logo, nome de exibição e cor primária aparecem no link público de rastreio,
// no login da central (/o/[slug]/login) e no PWA. Nos outros planos aparece a
// marca do Entrega Pra Mim. O logo segue a mesma validação do comprovante:
// só JPG, PNG ou WebP reconhecidos pelo conteúdo (SVG não, por poder ter script).
// =============================================================================

import path from 'path'
import type { PlanoOrganizacao } from '@prisma/client'
import prisma from './prisma'

export const LOGO_DIR = process.env.LOGO_DIR || path.join(process.cwd(), 'storage', 'logos')
export const LOGO_MAX_BYTES = 1024 * 1024
export const COR_VALIDA = /^#[0-9a-fA-F]{6}$/
const NOME_LOGO = /^[A-Za-z0-9_-]+\.(jpg|png|webp)$/

export function marcaPermitida(plano: PlanoOrganizacao): boolean {
  return plano === 'MARCA_PROPRIA'
}

export function nomeArquivoLogoSeguro(nome: string | null | undefined): string | null {
  return nome && NOME_LOGO.test(nome) ? nome : null
}

/** Marca pública de uma central pelo slug (o que o login, o PWA e o rastreio exibem). */
export async function marcaPublica(slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, nome: true, slug: true, plano: true, status: true, settings: { select: { nomeExibicao: true, corPrimaria: true, logoArquivo: true } } },
  })
  if (!org || org.status === 'SUSPENSA') return null
  const propria = marcaPermitida(org.plano)
  const s = org.settings
  return {
    id: org.id,
    slug: org.slug,
    nome: (propria && s?.nomeExibicao) || org.nome,
    marcaPropria: propria,
    corPrimaria: propria ? s?.corPrimaria ?? null : null,
    logoUrl: propria && nomeArquivoLogoSeguro(s?.logoArquivo) ? `/api/publico/organizacoes/${org.slug}/logo` : null,
  }
}
