'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Alert } from '@/components/ui/Feedback'
import AuthLayout from '@/components/layout/AuthLayout'
import { formatTelefone } from '@/utils/formatar-documentos'

// Cadastro público: "criar minha central". Motoboys e empresas clientes entram
// pelo link de convite que a própria central envia.
export default function RegistroPage() {
  const [nomeCentral, setNomeCentral] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (senha !== confirmarSenha) {
      setError('As senhas não conferem')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/publico/centrais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeCentral, nome, email, senha, telefone: telefone.replace(/\D/g, '') || undefined }),
      })
      const data = await response.json()
      if (!data.success) {
        setError(data.details?.[0]?.message || data.error || 'Erro ao criar a central')
        return
      }
      setSucesso(data.message)
    } catch {
      setError('Erro ao criar a central')
    } finally {
      setIsLoading(false)
    }
  }

  if (sucesso) {
    return (
      <AuthLayout>
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-success">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Central criada</h1>
        <p className="mt-1.5 text-sm text-fg-2">{sucesso}</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-fg underline underline-offset-4">Ir para o login</Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout wide>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Criar minha central</h1>
      <p className="mt-1.5 text-sm text-fg-3">
        Para donos de central de motofrete. É motoboy ou empresa cliente? Peça o link de convite à sua central.{' '}
        Já tem conta? <Link href="/login" className="font-medium text-fg underline underline-offset-4 hover:text-brand">Entrar</Link>
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {error && <Alert variant="danger" icon={AlertCircle}>{error}</Alert>}
        <Input label="Nome da central" value={nomeCentral} onChange={(e) => setNomeCentral(e.target.value)} placeholder="Moto Rápida JF" required />
        <Input label="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <Input label="WhatsApp" type="tel" value={telefone} onChange={(e) => setTelefone(formatTelefone(e.target.value))}
            placeholder="(32) 99999-9999" maxLength={16} inputMode="numeric" autoComplete="tel" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} helperText="Mínimo de 8 caracteres" minLength={8} maxLength={72} autoComplete="new-password" required />
          <Input label="Confirmar senha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required />
        </div>
        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>Criar central</Button>
        <p className="text-xs text-fg-3">A central começa no plano Essencial e é ativada pela nossa equipe após um contato rápido.</p>
      </form>
    </AuthLayout>
  )
}
