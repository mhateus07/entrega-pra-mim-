import type { PrismaClient } from '@prisma/client'
import type { OrgRole, OrgUser } from '@/lib/auth-helpers'
import { randomUUID } from 'node:crypto'

// Fixtures multi-tenant: cada suíte cria a própria central e remove tudo no fim.

export async function criarOrg(db: PrismaClient, nome = 'Central de teste') {
  return db.organization.create({
    data: { nome, slug: `teste-${randomUUID()}`, status: 'ATIVA', plano: 'MARCA_PROPRIA', settings: { create: {} } },
  })
}

export async function criarUsuario(db: PrismaClient, organizationId: string, papel: OrgRole, opts: { aprovado?: boolean } = {}): Promise<OrgUser> {
  const role = papel === 'DRIVER' ? 'MOTOBOY' : 'CLIENTE'
  const user = await db.user.create({ data: {
    nome: `Teste ${papel}`, email: `${randomUUID()}@test.local`, senha: 'fixture', role,
    memberships: { create: { organizationId, papel } },
  } })
  let motoboyId: string | null = null
  let clienteId: string | null = null
  if (papel === 'DRIVER') {
    motoboyId = (await db.motoboy.create({ data: {
      organizationId, userId: user.id, cnh: randomUUID(), veiculoTipo: 'Moto', veiculoMarca: 'Teste', veiculoModelo: 'Teste',
      veiculoPlaca: randomUUID(), status: 'DISPONIVEL', aprovacao: opts.aprovado === false ? 'PENDENTE_APROVACAO' : 'APROVADO',
    } })).id
  }
  if (papel === 'CLIENT') {
    clienteId = (await db.cliente.create({ data: { organizationId, userId: user.id } })).id
  }
  return { id: user.id, email: user.email, superadmin: false, organizationId, orgRole: papel, motoboyId, clienteId }
}

/** Remove a central de teste e tudo que pertence a ela. */
export async function removerOrg(db: PrismaClient, organizationId: string) {
  const where = { organizationId }
  await db.mensagem.deleteMany({ where })
  await db.avaliacao.deleteMany({ where })
  await db.transacaoMotoboy.deleteMany({ where })
  await db.pagamento.deleteMany({ where })
  await db.pedido.deleteMany({ where })
  await db.endereco.deleteMany({ where })
  await db.saldoMotoboy.deleteMany({ where })
  await db.auditLog.deleteMany({ where })
  const membros = await db.organizationMember.findMany({ where, select: { userId: true } })
  await db.motoboy.deleteMany({ where })
  await db.cliente.deleteMany({ where })
  await db.organization.delete({ where: { id: organizationId } })
  await db.user.deleteMany({ where: { id: { in: membros.map(m => m.userId) }, memberships: { none: {} } } })
}
