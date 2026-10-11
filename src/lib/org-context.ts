// =============================================================================
// Contexto de organização da sessão
// =============================================================================
// Resolve qual central está ativa para o usuário e quais são os perfis dele
// nessa central (motoboy/cliente). Usado pelo NextAuth no login, na troca de
// central e na revalidação periódica da sessão.
// =============================================================================

import type { OrgRole, StatusOrganizacao } from '@prisma/client'
import prisma from './prisma'

export interface ContextoOrg {
  activeOrganizationId: string | null
  orgRole: OrgRole | null
  orgStatus: StatusOrganizacao | null
  motoboyId: string | null
  clienteId: string | null
}

const SEM_ORG: ContextoOrg = { activeOrganizationId: null, orgRole: null, orgStatus: null, motoboyId: null, clienteId: null }

/**
 * @param preferida organização pedida (troca de central ou a que já estava ativa).
 *   Membro comum só entra em organização da qual é membro; o superadmin entra em
 *   qualquer uma e atua como OWNER quando não tem papel próprio nela.
 */
export async function resolverContextoOrg(userId: string, superadmin: boolean, preferida?: string | null): Promise<ContextoOrg> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true, papel: true, organization: { select: { status: true } } },
    orderBy: { createdAt: 'asc' },
  })

  let escolhida: { organizationId: string; papel: OrgRole; status: StatusOrganizacao } | null = null
  const membro = memberships.find(m => m.organizationId === preferida) ?? null
  if (membro) {
    escolhida = { organizationId: membro.organizationId, papel: membro.papel, status: membro.organization.status }
  } else if (superadmin && preferida) {
    const org = await prisma.organization.findUnique({ where: { id: preferida }, select: { id: true, status: true } })
    if (org) escolhida = { organizationId: org.id, papel: 'OWNER', status: org.status }
  }
  if (!escolhida && memberships[0]) {
    const m = memberships[0]
    escolhida = { organizationId: m.organizationId, papel: m.papel, status: m.organization.status }
  }
  if (!escolhida) return SEM_ORG

  const chave = { organizationId: escolhida.organizationId, userId }
  const [motoboy, cliente] = await Promise.all([
    prisma.motoboy.findUnique({ where: { organizationId_userId: chave }, select: { id: true } }),
    prisma.cliente.findUnique({ where: { organizationId_userId: chave }, select: { id: true } }),
  ])
  return {
    activeOrganizationId: escolhida.organizationId,
    orgRole: escolhida.papel,
    orgStatus: escolhida.status,
    motoboyId: motoboy?.id ?? null,
    clienteId: cliente?.id ?? null,
  }
}

export { paginaInicial } from '@/utils/area'
