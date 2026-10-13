'use client'

import { useState } from 'react'
import { signIn, getSession, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Alert } from '@/components/ui/Feedback'
import Logo from '@/components/brand/Logo'
import { paginaInicial } from '@/utils/area'

interface Marca { id: string; slug: string; nome: string; marcaPropria: boolean; corPrimaria: string | null; logoUrl: string | null }

export default function LoginCentral({ marca }: { marca: Marca }) {
  const router = useRouter()
  const { update } = useSession()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const resultado = await signIn('credentials', { email, senha, redirect: false })
      if (resultado?.error) {
        setErro(resultado.error === 'TooManyRequests' ? 'Muitas tentativas. Aguarde um minuto.' : 'E-mail ou senha incorretos')
        return
      }
      // Entra já na central do link (se a pessoa for membro dela)
      await getSession()
      const sessao = await update({ activeOrganizationId: marca.id })
      router.push(paginaInicial(sessao?.user?.orgRole, sessao?.user?.superadmin))
      router.refresh()
    } catch {
      setErro('Erro ao entrar')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-10"
      style={marca.corPrimaria ? ({ '--brand': marca.corPrimaria } as React.CSSProperties) : undefined}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {marca.logoUrl
            // eslint-disable-next-line @next/next/no-img-element -- logo servido pela rota pública da central
            ? <img src={marca.logoUrl} alt={marca.nome} className="h-14 max-w-[200px] object-contain" />
            : <Logo markClassName="h-8 w-8" className="[&>span:last-child]:text-[22px]" />}
          <h1 className="titulo-display mt-4 text-[30px] text-fg">{marca.nome}</h1>
          <p className="mt-1 text-sm text-fg-3">Entre com seu e-mail e senha</p>
        </div>
        <form className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-xs" onSubmit={entrar}>
          {erro && <Alert variant="danger" icon={AlertCircle}>{erro}</Alert>}
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
          <Button type="submit" className="w-full bg-[var(--brand)] text-white hover:opacity-90" size="lg" isLoading={carregando}>Entrar</Button>
        </form>
        {!marca.marcaPropria && <p className="mt-6 text-center text-xs text-fg-3">Tecnologia Entrega Pra Mim</p>}
      </div>
    </div>
  )
}
