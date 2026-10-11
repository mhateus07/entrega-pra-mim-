import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from './prisma'
import { registrarAuditoria } from './audit'
import { resolverContextoOrg } from './org-context'

const REVALIDAR_SESSAO_MS = 5 * 60 * 1000

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        senha: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials, req) {
        const ip = (req?.headers?.['x-real-ip'] as string | undefined) ?? null
        if (!credentials?.email || !credentials?.senha) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user) {
            await registrarAuditoria({ acao: 'auth.login_falhou', entidade: 'User', ip, dados: { motivo: 'usuario_inexistente' } })
            return null
          }

          const senhaCorreta = await bcrypt.compare(
            credentials.senha,
            user.senha
          )

          if (!senhaCorreta) {
            await registrarAuditoria({ acao: 'auth.login_falhou', entidade: 'User', entidadeId: user.id, ip, dados: { motivo: 'senha_incorreta' } })
            return null
          }

          await registrarAuditoria({ acao: 'auth.login', entidade: 'User', entidadeId: user.id, userId: user.id, ip })

          return {
            id: user.id,
            email: user.email,
            name: user.nome,
            superadmin: user.role === 'SUPERADMIN',
          }
        } catch (error) {
          console.error('Falha interna ao autenticar usuário:', error)
          throw new Error('Configuration')
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 dias (padrão do next-auth é 30)
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.superadmin = user.superadmin
        Object.assign(token, await resolverContextoOrg(user.id, user.superadmin), { verificadoEm: Date.now() })
        return token
      }
      if (!token.id) return token

      // Troca de central pelo seletor: só vale se o usuário for membro (ou superadmin)
      if (trigger === 'update' && typeof session?.activeOrganizationId === 'string') {
        Object.assign(token, await resolverContextoOrg(String(token.id), !!token.superadmin, session.activeOrganizationId), { verificadoEm: Date.now() })
        return token
      }

      // JWT não é revogável: a cada 5 min o usuário e o papel na central são relidos.
      // Usuário excluído perde a identidade da sessão e passa a receber 401.
      if (Date.now() - Number(token.verificadoEm ?? 0) > REVALIDAR_SESSAO_MS) {
        const atual = await prisma.user.findUnique({ where: { id: String(token.id) }, select: { role: true } })
        if (!atual) return {} as typeof token
        token.superadmin = atual.role === 'SUPERADMIN'
        Object.assign(token, await resolverContextoOrg(String(token.id), token.superadmin, token.activeOrganizationId), { verificadoEm: Date.now() })
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.superadmin = !!token.superadmin
        session.user.activeOrganizationId = token.activeOrganizationId ?? null
        session.user.orgRole = token.orgRole ?? null
        session.user.orgStatus = token.orgStatus ?? null
        session.user.motoboyId = token.motoboyId ?? null
        session.user.clienteId = token.clienteId ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
