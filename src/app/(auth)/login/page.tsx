'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Alert } from '@/components/ui/Feedback'
import AuthLayout from '@/components/layout/AuthLayout'

const authErrors: Record<string, string> = {
  Configuration: 'Erro de configuração do servidor. Tente novamente mais tarde.',
  AccessDenied: 'Acesso negado. Você não tem permissão para acessar.',
  Verification: 'O link de verificação expirou ou já foi usado.',
  Default: 'Ocorreu um erro na autenticação. Tente novamente.',
  CredentialsSignin: 'E-mail ou senha incorretos.',
  SessionRequired: 'Você precisa estar logado para acessar essa página.',
  TooManyRequests: 'Muitas tentativas de login. Aguarde um minuto e tente novamente.',
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(authErrors[errorParam] || authErrors.Default)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        senha,
        redirect: false,
      })

      if (result?.error) {
        setError(authErrors[result.error] || authErrors.Default)
      } else {
        const sessionRes = await fetch('/api/auth/session')
        const session = await sessionRes.json()

        const role = session?.user?.role
        if (role === 'ADMIN') {
          router.push('/dashboard')
        } else if (role === 'MOTOBOY') {
          router.push('/motoboy')
        } else {
          router.push('/cliente')
        }
        router.refresh()
      }
    } catch {
      setError('Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Entrar</h1>
      <p className="mt-1.5 text-sm text-fg-3">
        Não tem conta?{' '}
        <Link href="/registro" className="font-medium text-fg underline underline-offset-4 hover:text-brand">
          Cadastre-se
        </Link>
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {error && <Alert variant="danger" icon={AlertCircle}>{error}</Alert>}

        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@empresa.com.br"
          required
          autoComplete="email"
          autoFocus
        />

        <Input
          label="Senha"
          type={mostrarSenha ? 'text' : 'password'}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          autoComplete="current-password"
          trailing={
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-3 hover:text-fg"
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
