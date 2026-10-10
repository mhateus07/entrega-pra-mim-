import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from './prisma'
import { registrarAuditoria } from './audit'

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
            include: {
              motoboy: true,
              cliente: true,
            },
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
            role: user.role,
            motoboyId: user.motoboy?.id || null,
            clienteId: user.cliente?.id || null,
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
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.motoboyId = user.motoboyId
        token.clienteId = user.clienteId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.motoboyId = token.motoboyId as string | null
        session.user.clienteId = token.clienteId as string | null
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
