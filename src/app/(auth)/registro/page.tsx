'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 px-4 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

        <motion.div
          className="max-w-md w-full text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-3xl p-10 shadow-xl border border-white/20 dark:border-slate-700/50 relative z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <motion.h2
            className="text-2xl font-bold text-gradient mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Conta criada com sucesso!
          </motion.h2>
          <motion.p
            className="text-slate-500 dark:text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Redirecionando para o login...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        className="max-w-md w-full relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-xl shadow-cyan-500/5 border border-white/20 dark:border-slate-700/50"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-center">
            <Link href="/" className="flex justify-center items-center gap-3">
              <motion.div
                className="w-16 h-16 relative rounded-2xl overflow-hidden"
                whileHover={{ rotate: 5, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Image src="/icons/app-icon.png" alt="Entrega Pra Mim" fill className="object-cover" />
              </motion.div>
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-gradient">Crie sua conta</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Já tem uma conta?{' '}
              <Link href="/login" className="font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors">
                Faça login
              </Link>
            </p>
          </div>

          {/* Seletor de tipo */}
          <motion.div
            className="mt-8 flex rounded-2xl bg-slate-100/80 dark:bg-slate-900/50 backdrop-blur-sm p-1.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.button
              type="button"
              onClick={() => setTipo('cliente')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                tipo === 'cliente'
                  ? 'bg-gradient-to-r from-[#0A4D68] to-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              Sou Cliente
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setTipo('motoboy')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                tipo === 'motoboy'
                  ? 'bg-gradient-to-r from-[#0A4D68] to-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              Sou Motoboy
            </motion.button>
          </motion.div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
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
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(11) 99999-9999"
                maxLength={16}
                inputMode="numeric"
                required
              />

              <AnimatePresence mode="wait">
                {tipo === 'cliente' && (
                  <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Select
                      label="Tipo de pessoa"
                      options={[
                        { value: 'PF', label: 'Pessoa Física' },
                        { value: 'PJ', label: 'Pessoa Jurídica' },
                      ]}
                      value={tipoPessoa}
                      onChange={(e) => { setTipoPessoa(e.target.value); setCpfCnpj('') }}
                    />

                    <Input
                      label={tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
                      value={cpfCnpj}
                      onChange={(e) =>
                        setCpfCnpj(tipoPessoa === 'PF' ? formatCPF(e.target.value) : formatCNPJ(e.target.value))
                      }
                      placeholder={tipoPessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                      maxLength={tipoPessoa === 'PF' ? 14 : 18}
                      inputMode="numeric"
                    />
                  </motion.div>
                )}

                {tipo === 'motoboy' && (
                  <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Input
                      label="CNH"
                      value={cnh}
                      onChange={(e) => setCnh(e.target.value)}
                      placeholder="00000000000"
                      required
                    />

                    <Select
                      label="Tipo de veículo"
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
                  </motion.div>
                )}
              </AnimatePresence>

              <Input
                label="Senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />

              <Input
                label="Confirmar senha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a senha"
                minLength={6}
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Criar conta
              </Button>
            </motion.div>

            <motion.p
              className="text-xs text-center text-slate-500 dark:text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Ao criar uma conta, você concorda com nossos{' '}
              <a href="#" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors">Termos de Serviço</a>{' '}
              e{' '}
              <a href="#" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors">Política de Privacidade</a>.
            </motion.p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <motion.div
        className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
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
