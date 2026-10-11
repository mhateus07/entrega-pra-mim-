'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import AuthLayout from '@/components/layout/AuthLayout'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatCNPJ, formatCPF, formatTelefone } from '@/utils/formatar-documentos'

export type PapelConvite = 'CLIENT' | 'DRIVER' | 'DISPATCHER'

interface Props {
  token: string
  papel: PapelConvite
  central: string
  email?: string | null
  nome?: string | null
}

// Formulário do convite: os campos dependem do papel (empresa cliente, motoboy ou despachante)
export default function CadastroConvite({ token, papel, central, email: emailConvite, nome: nomeConvite }: Props) {
  const router = useRouter()
  const tipo = papel === 'DRIVER' ? 'motoboy' : papel === 'CLIENT' ? 'cliente' : 'despachante'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const [nome, setNome] = useState(nomeConvite ?? '')
  const [email, setEmail] = useState(emailConvite ?? '')
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
      const endpoint = `/api/publico/convites/${encodeURIComponent(token)}`
      const base = { email, senha, nome, telefone: telefone.replace(/\D/g, '') || undefined }
      const body =
        tipo === 'despachante'
          ? base
          : tipo === 'cliente'
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
        setError(data.details?.[0]?.message || data.error || 'Erro ao criar conta')
        return
      }

      setSuccess(data.message || 'Cadastro concluído')
      setTimeout(() => {
        router.push('/login')
      }, 5000)
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
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Cadastro concluído</h1>
        <p className="mt-1.5 text-sm text-fg-2">{success}</p>
        <p className="mt-1.5 text-sm text-fg-3">Redirecionando para o login…</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout wide>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Convite de {central}</h1>
      <p className="mt-1.5 text-sm text-fg-3">
        {papel === 'DRIVER' ? 'Cadastre-se como entregador da central.' : papel === 'CLIENT' ? 'Cadastre sua empresa para pedir entregas à central.' : 'Entre na equipe da central como despachante.'}
        {' '}Já tem conta no Entrega Pra Mim? Use o mesmo e-mail e senha.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {error && <Alert variant="danger" icon={AlertCircle}>{error}</Alert>}

        <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={!!emailConvite} placeholder="voce@empresa.com.br" autoComplete="email" required />
          <Input
            label="Telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(formatTelefone(e.target.value))}
            placeholder="(32) 99999-9999"
            maxLength={16}
            inputMode="numeric"
            autoComplete="tel"
            required={tipo !== 'despachante'}
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
          <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} helperText="Mínimo de 8 caracteres" minLength={8} maxLength={72} autoComplete="new-password" required />
          <Input label="Confirmar senha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required />
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  )
}
