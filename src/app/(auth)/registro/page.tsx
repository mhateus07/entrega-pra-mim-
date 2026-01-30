'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

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

  // Campos comuns
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [telefone, setTelefone] = useState('')

  // Campos de cliente
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [tipoPessoa, setTipoPessoa] = useState('PF')

  // Campos de motoboy
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Conta criada com sucesso!
          </h2>
          <p className="text-gray-600">
            Redirecionando para o login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link href="/" className="flex justify-center items-center gap-2">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Crie sua conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ja tem uma conta?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Faca login
            </Link>
          </p>
        </div>

        {/* Seletor de tipo */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setTipo('cliente')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tipo === 'cliente'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sou Cliente
          </button>
          <button
            type="button"
            onClick={() => setTipo('motoboy')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tipo === 'motoboy'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sou Motoboy
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />

            <Input
              label="Telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
              required
            />

            {tipo === 'cliente' && (
              <>
                <Select
                  label="Tipo de pessoa"
                  options={[
                    { value: 'PF', label: 'Pessoa Fisica' },
                    { value: 'PJ', label: 'Pessoa Juridica' },
                  ]}
                  value={tipoPessoa}
                  onChange={(e) => setTipoPessoa(e.target.value)}
                />

                <Input
                  label={tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  placeholder={
                    tipoPessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'
                  }
                />
              </>
            )}

            {tipo === 'motoboy' && (
              <>
                <Input
                  label="CNH"
                  value={cnh}
                  onChange={(e) => setCnh(e.target.value)}
                  placeholder="00000000000"
                  required
                />

                <Select
                  label="Tipo de veiculo"
                  options={[
                    { value: 'Moto', label: 'Moto' },
                    { value: 'Bicicleta', label: 'Bicicleta' },
                    { value: 'Carro', label: 'Carro' },
                  ]}
                  value={veiculoTipo}
                  onChange={(e) => setVeiculoTipo(e.target.value)}
                  placeholder="Selecione o tipo"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Marca"
                    value={veiculoMarca}
                    onChange={(e) => setVeiculoMarca(e.target.value)}
                    placeholder="Honda"
                    required
                  />

                  <Input
                    label="Modelo"
                    value={veiculoModelo}
                    onChange={(e) => setVeiculoModelo(e.target.value)}
                    placeholder="CG 160"
                    required
                  />
                </div>

                <Input
                  label="Placa"
                  value={veiculoPlaca}
                  onChange={(e) => setVeiculoPlaca(e.target.value)}
                  placeholder="ABC1D23"
                  required
                />
              </>
            )}

            <Input
              label="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Minimo 6 caracteres"
              required
            />

            <Input
              label="Confirmar senha"
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Repita a senha"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Criar conta
          </Button>

          <p className="text-xs text-center text-gray-500">
            Ao criar uma conta, voce concorda com nossos{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Termos de Servico
            </a>{' '}
            e{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Politica de Privacidade
            </a>
            .
          </p>
        </form>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RegistroForm />
    </Suspense>
  )
}
