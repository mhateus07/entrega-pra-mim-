'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Bike, CheckCircle2, Package } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Alert, FullPageLoader } from '@/components/ui/Feedback'
import AuthLayout from '@/components/layout/AuthLayout'
import { cn } from '@/utils/cn'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 8)}-${digits.slice(8)}`
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function RegistroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tipoInicial = searchParams.get('tipo') || 'cliente'

  const [tipo, setTipo] = useState<'cliente' | 'motoboy'>(
    tipoInicial as 'cliente' | 'motoboy'
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [tipoPessoa, setTipoPessoa] = useState('PF')
  const [cnh, setCnh] = useState('')
  const [veiculoTipo, setVeiculoTipo] = useState('')
  const [veiculoMarca, setVeiculoMarca] = useState('')
  const [veiculoModelo, setVeiculoModelo] = useState('')
  const [veiculoPlaca, setVeiculoPlaca] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (senha !== confirmarSenha) {
      setError('As senhas não conferem')
      setIsLoading(false)
      return
    }

    try {
      const endpoint = tipo === 'cliente' ? '/api/clientes' : '/api/motoboys'
      const body =
        tipo === 'cliente'
          ? {
              email,
              senha,
              nome,
              telefone: telefone.replace(/\D/g, ''),
              cpfCnpj: cpfCnpj.replace(/\D/g, ''),
              tipoPessoa,
            }
          : {
              email,
              senha,
              nome,
              telefone: telefone.replace(/\D/g, ''),
              cnh: cnh.replace(/\D/g, ''),
              veiculoTipo,
              veiculoMarca,
              veiculoModelo,
              veiculoPlaca: veiculoPlaca.toUpperCase().replace(/[^A-Z0-9]/g, ''),
            }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Erro ao criar conta')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch {
      setError('Erro ao criar conta')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-success">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Conta criada</h1>
        <p className="mt-1.5 text-sm text-fg-3">Redirecionando para o login…</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout wide>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Criar conta</h1>
      <p className="mt-1.5 text-sm text-fg-3">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-fg underline underline-offset-4 hover:text-brand">
          Entrar
        </Link>
      </p>

      <div className="mt-8 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de conta">
        {([
          { value: 'cliente', title: 'Quero enviar', text: 'Solicitar entregas', icon: Package },
          { value: 'motoboy', title: 'Quero entregar', text: 'Trabalhar como entregador', icon: Bike },
        ] as const).map((o) => {
          const ativo = tipo === o.value
          const Icon = o.icon
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => setTipo(o.value)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                ativo ? 'border-fg bg-surface ring-1 ring-fg' : 'border-line-strong bg-surface hover:border-fg-3'
              )}
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ativo ? 'text-brand' : 'text-fg-3')} aria-hidden="true" />
              <span>
                <span className="block text-sm font-medium text-fg">{o.title}</span>
                <span className="block text-xs text-fg-3">{o.text}</span>
              </span>
            </button>
          )
        })}
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {error && <Alert variant="danger" icon={AlertCircle}>{error}</Alert>}

        <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" autoComplete="email" required />
          <Input
            label="Telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(formatTelefone(e.target.value))}
            placeholder="(32) 99999-9999"
            maxLength={16}
            inputMode="numeric"
            autoComplete="tel"
            required
          />
        </div>

        {tipo === 'cliente' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tipo de pessoa"
              options={[
                { value: 'PF', label: 'Pessoa física' },
                { value: 'PJ', label: 'Pessoa jurídica' },
              ]}
              value={tipoPessoa}
              onChange={(e) => { setTipoPessoa(e.target.value); setCpfCnpj('') }}
            />
            <Input
              label={tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(tipoPessoa === 'PF' ? formatCPF(e.target.value) : formatCNPJ(e.target.value))}
              placeholder={tipoPessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
              maxLength={tipoPessoa === 'PF' ? 14 : 18}
              inputMode="numeric"
            />
          </div>
        )}

        {tipo === 'motoboy' && (
          <fieldset className="space-y-4 rounded-xl border border-line p-4">
            <legend className="px-1 text-[13px] font-medium text-fg-2">Habilitação e veículo</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="CNH" value={cnh} onChange={(e) => setCnh(e.target.value)} placeholder="Somente números" inputMode="numeric" required />
              <Select
                label="Tipo de veículo"
                options={[
                  { value: 'Moto', label: 'Moto' },
                  { value: 'Bicicleta', label: 'Bicicleta' },
                  { value: 'Carro', label: 'Carro' },
                ]}
                value={veiculoTipo}
                onChange={(e) => setVeiculoTipo(e.target.value)}
                placeholder="Selecione"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Marca" value={veiculoMarca} onChange={(e) => setVeiculoMarca(e.target.value)} placeholder="Honda" required />
              <Input label="Modelo" value={veiculoModelo} onChange={(e) => setVeiculoModelo(e.target.value)} placeholder="CG 160" required />
              <Input label="Placa" value={veiculoPlaca} onChange={(e) => setVeiculoPlaca(e.target.value)} placeholder="ABC1D23" className="uppercase" required />
            </div>
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} helperText="Mínimo de 6 caracteres" minLength={6} autoComplete="new-password" required />
          <Input label="Confirmar senha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} minLength={6} autoComplete="new-password" required />
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <RegistroForm />
    </Suspense>
  )
}
