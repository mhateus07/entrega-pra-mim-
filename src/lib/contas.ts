// =============================================================================
// Criação de contas e perfis dentro de uma central
// =============================================================================
// Usado pelo aceite de convite, pelo cadastro feito pela própria central e pela
// criação de uma central nova. Um mesmo e-mail pode pertencer a várias centrais:
// se a conta já existe, a senha informada precisa ser a dela.
// =============================================================================

import bcrypt from 'bcryptjs'
import type { OrgRole, Prisma, UserRole } from '@prisma/client'
import { OperacaoError } from './operacao-error'

export const CADASTRO_INDISPONIVEL = 'Não foi possível concluir o cadastro: e-mail, documento ou placa já em uso nesta central. Se você já tem conta, use a mesma senha.'

interface DadosConta {
  email: string
  senha: string
  nome: string
  telefone?: string | null
}

/** Cria a conta (ou reaproveita a existente, conferindo a senha) e o vínculo com a central. */
export async function vincularConta(
  tx: Prisma.TransactionClient,
  organizationId: string,
  papel: OrgRole,
  dados: DadosConta,
): Promise<{ userId: string; contaNova: boolean }> {
  const email = dados.email.trim().toLowerCase()
  const existente = await tx.user.findUnique({ where: { email }, select: { id: true, senha: true } })
  if (existente) {
    // Mensagem única: não revela se o e-mail existe ou se a senha está errada
    if (!(await bcrypt.compare(dados.senha, existente.senha))) throw new OperacaoError(CADASTRO_INDISPONIVEL, 400)
    const membro = await tx.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: existente.id } },
    })
    if (membro) throw new OperacaoError('Você já faz parte desta central. Entre com seu e-mail e senha.', 409)
    await tx.organizationMember.create({ data: { organizationId, userId: existente.id, papel } })
    return { userId: existente.id, contaNova: false }
  }
  const role: UserRole = papel === 'DRIVER' ? 'MOTOBOY' : 'CLIENTE'
  const user = await tx.user.create({
    data: {
      email, nome: dados.nome, telefone: dados.telefone ?? null, role,
      senha: await bcrypt.hash(dados.senha, 10),
      memberships: { create: { organizationId, papel } },
    },
    select: { id: true },
  })
  return { userId: user.id, contaNova: true }
}

export async function criarPerfilMotoboy(
  tx: Prisma.TransactionClient,
  organizationId: string,
  userId: string,
  dados: { cnh: string; veiculoTipo: string; veiculoMarca: string; veiculoModelo: string; veiculoPlaca: string },
) {
  const placa = dados.veiculoPlaca.toUpperCase()
  const duplicado = await tx.motoboy.findFirst({
    where: { organizationId, OR: [{ cnh: dados.cnh }, { veiculoPlaca: placa }] }, select: { id: true },
  })
  if (duplicado) throw new OperacaoError(CADASTRO_INDISPONIVEL, 400)
  return tx.motoboy.create({
    data: {
      organizationId, userId, cnh: dados.cnh, veiculoTipo: dados.veiculoTipo, veiculoMarca: dados.veiculoMarca,
      veiculoModelo: dados.veiculoModelo, veiculoPlaca: placa, aprovacao: 'PENDENTE_APROVACAO',
    },
    select: { id: true, aprovacao: true },
  })
}

export async function criarPerfilCliente(
  tx: Prisma.TransactionClient,
  organizationId: string,
  userId: string,
  dados: { cpfCnpj?: string | null; tipoPessoa?: string; razaoSocial?: string | null },
) {
  if (dados.cpfCnpj) {
    const duplicado = await tx.cliente.findUnique({
      where: { organizationId_cpfCnpj: { organizationId, cpfCnpj: dados.cpfCnpj } }, select: { id: true },
    })
    if (duplicado) throw new OperacaoError(CADASTRO_INDISPONIVEL, 400)
  }
  return tx.cliente.create({
    data: { organizationId, userId, cpfCnpj: dados.cpfCnpj || null, tipoPessoa: dados.tipoPessoa ?? 'PF', razaoSocial: dados.razaoSocial || null },
    select: { id: true },
  })
}

/** Slug único a partir do nome da central (ex.: "Moto Rápida JF" → "moto-rapida-jf"). */
export async function gerarSlug(tx: Prisma.TransactionClient, nome: string): Promise<string> {
  const base = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'central'
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`
    if (!(await tx.organization.findUnique({ where: { slug }, select: { id: true } }))) return slug
  }
  return `${base}-${Date.now().toString(36)}`
}
