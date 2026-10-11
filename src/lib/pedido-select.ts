import type { Prisma } from '@prisma/client'

// Dados do cliente que podem acompanhar um pedido. CPF/CNPJ e e-mail ficam de
// fora: só o admin os vê, nas telas de cliente.
export const clientePedidoSelect = {
  id: true, tipoPessoa: true, razaoSocial: true,
  user: { select: { nome: true, telefone: true } },
} satisfies Prisma.ClienteSelect
