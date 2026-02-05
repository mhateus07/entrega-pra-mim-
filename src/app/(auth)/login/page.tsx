'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
        setError(result.error)
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
    } catch (err) {
      setError('Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-cyan-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Form */}
      <motion.div
        className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-md w-full">
          <motion.div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-xl shadow-cyan-500/5 border border-white/20 dark:border-slate-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/" className="flex justify-center items-center gap-3">
                <motion.div
                  className="w-16 h-16 relative rounded-2xl overflow-hidden"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Image src="/icons/app-icon.png" alt="Entrega Pra Mim" fill className="object-cover" />
                </motion.div>
              </Link>
              <h2 className="mt-6 text-center text-3xl font-bold text-gradient">
                Acesse sua conta
              </h2>
              <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                Ou{' '}
                <Link href="/registro" className="font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors">
                  crie uma conta nova
                </Link>
              </p>
            </motion.div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                transition={{ delay: 0.4 }}
              >
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                />

                <Input
                  label="Senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="********"
                  required
                  autoComplete="current-password"
                />
              </motion.div>

              <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-600 rounded bg-white/50 dark:bg-slate-700/50"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 dark:text-slate-400">
                    Lembrar de mim
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors">
                    Esqueceu a senha?
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                  Entrar
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </motion.div>

      {/* Branding side */}
      <motion.div
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative z-10"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="gradient-bg absolute inset-0 opacity-90" />
        <div className="text-center text-white relative z-10">
          <motion.div
            className="w-40 h-40 mx-auto mb-8 relative float"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
          >
            <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl" />
            <Image src="/logo-badge.png" alt="Entrega Pra Mim" fill className="object-contain relative z-10 drop-shadow-2xl rounded-full" />
          </motion.div>
          <motion.h1
            className="text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            ENTREGA PRA MIM
          </motion.h1>
          <motion.p
            className="text-white/80 text-lg max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            Tecnologia logística e delivery urbano com velocidade, agilidade, precisão e confiabilidade.
          </motion.p>

          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-cyan-300/20 rounded-full blur-2xl" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
