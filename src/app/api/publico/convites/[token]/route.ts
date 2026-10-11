import { NextRequest } from 'next/server'
import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { applyRateLimit, badRequest, notFound, serverError } from '@/lib/auth-helpers'
import { aceitarConviteDespachanteSchema, createClienteSchema, createMotoboySchema } from '@/lib/validations'
import { criarPerfilCliente, criarPerfilMotoboy, vincularConta } from '@/lib/contas'
import { hashToken, TOKEN_VALIDO } from '@/lib/tokens'
import { verificarLimiteMotoboys } from '@/lib/uso'
import { registrarAuditoria } from '@/lib/audit'
import { OperacaoError } from '@/lib/operacao-error'

type Params = { params: Promise<{ token: string }> }

async function conviteValido(token: string) {
  if (!TOKEN_VALIDO.test(token)) return null
  const convite = await prisma.convite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: { select: { nome: true, status: true } } },
  })
  if (!convite || convite.usadoEm || convite.expiresAt <= new Date() || convite.organization.status === 'SUSPENSA') return null
  return convite
}

// GET /api/publico/convites/[token] - Dados para a tela de aceite (central e papel)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const rateLimit = await applyRateLimit(request, 'polling')
    if (!rateLimit.success) return rateLimit.response
    const convite = await conviteValido((await params).token)
    if (!convite) return notFound('Convite inválido, usado ou expirado. Peça um novo link à central.')
    return jsonResponse({
      success: true,
      data: { central: convite.organization.nome, papel: convite.papel, email: convite.email, nome: convite.nome, expiraEm: convite.expiresAt },
    })
  } catch (error) {
    console.error('Erro ao ler convite:', error)
    return serverError()
  }
}

// POST /api/publico/convites/[token] - Aceitar convite: cria a conta (ou vincula a
// existente, conferindo a senha) e o perfil na central. Cada link vale uma vez.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const rateLimit = await applyRateLimit(request, 'auth')
    if (!rateLimit.success) return rateLimit.response
    const convite = await conviteValido((await params).token)
    if (!convite) return notFound('Convite inválido, usado ou expirado. Peça um novo link à central.')

    const body = await request.json().catch(() => null)
    const schema = convite.papel === 'DRIVER' ? createMotoboySchema : convite.papel === 'CLIENT' ? createClienteSchema : aceitarConviteDespachanteSchema
    const validation = schema.safeParse(body)
    if (!validation.success) {
      return jsonResponse({ success: false, error: 'Dados inválidos', details: validation.error.issues }, { status: 400 })
    }
    const data = validation.data
    if (convite.email && convite.email.toLowerCase() !== data.email.trim().toLowerCase()) {
      return badRequest('Use o e-mail para o qual o convite foi enviado')
    }
    const organizationId = convite.organizationId
    if (convite.papel === 'DRIVER') await verificarLimiteMotoboys(organizationId, true)

    const userId = await prisma.$transaction(async (tx) => {
      // Consome o convite de forma atômica: dois aceites simultâneos não passam
      const consumido = await tx.convite.updateMany({
        where: { id: convite.id, usadoEm: null, expiresAt: { gt: new Date() } },
        data: { usadoEm: new Date() },
      })
      if (consumido.count !== 1) throw new OperacaoError('Este convite já foi usado', 409)
      const { userId } = await vincularConta(tx, organizationId, convite.papel, data)
      if (convite.papel === 'DRIVER') await criarPerfilMotoboy(tx, organizationId, userId, data as typeof data & Parameters<typeof criarPerfilMotoboy>[3])
      if (convite.papel === 'CLIENT') await criarPerfilCliente(tx, organizationId, userId, data as Parameters<typeof criarPerfilCliente>[3])
      await tx.convite.update({ where: { id: convite.id }, data: { usadoPorId: userId } })
      return userId
    })

    await registrarAuditoria({
      acao: 'convite.aceito', entidade: 'Convite', entidadeId: convite.id, userId, organizationId, request,
      dados: { papel: convite.papel },
    })

    return jsonResponse({
      success: true,
      message: convite.papel === 'DRIVER'
        ? `Cadastro enviado para ${convite.organization.nome}. Você poderá receber pedidos assim que a central aprovar.`
        : `Pronto! Você agora faz parte de ${convite.organization.nome}. Entre com seu e-mail e senha.`,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof OperacaoError) return jsonResponse({ success: false, error: error.message }, { status: error.status })
    console.error('Erro ao aceitar convite:', error)
    return serverError('Erro ao aceitar convite')
  }
}
