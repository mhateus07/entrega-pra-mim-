'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import Input from '@/components/ui/Input'
import { formatarMoeda } from '@/lib/pricing'
import { formatarDataHora } from '@/utils/helpers'

interface Cliente {
  id: string
  cpfCnpj: string | null
  user: {
    id: string
    nome: string
    email: string
    telefone: string
    createdAt: string
  }
  _count?: {
    pedidos: number
  }
  pedidos?: {
    valorTotal: number
    status: string
  }[]
}

export default function ClientesAdminPage() {
  const { status } = useSession()
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await fetch('/api/clientes')
        const data = await response.json()

        if (data.success) {
          setClientes(data.data)
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchClientes()
    }
  }, [status])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 relative">
            <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
          </div>
          <p className="text-cyan-400 text-sm">Carregando clientes...</p>
        </div>
      </div>
    )
  }

  const clientesFiltrados = busca
    ? clientes.filter(c =>
        c.user.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.user.email.toLowerCase().includes(busca.toLowerCase()) ||
        c.user.telefone.includes(busca)
      )
    : clientes

  const calcularTotalGasto = (cliente: Cliente) => {
    if (!cliente.pedidos) return 0
    return cliente.pedidos
      .filter(p => p.status === 'ENTREGUE')
      .reduce((acc, p) => acc + p.valorTotal, 0)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <DashboardHeader activeTab="clientes" />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-xl sm:text-2xl font-bold text-white">Clientes</h1>
          <p className="text-slate-400 text-sm">{clientesFiltrados.length} clientes encontrados</p>
        </motion.div>

        {/* Busca */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-slate-800/50 border-cyan-500/20 text-white placeholder:text-slate-500 focus:border-cyan-500/50"
            />
          </div>
        </motion.div>

        {/* Lista */}
        {clientesFiltrados.length === 0 ? (
          <motion.div
            className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/10 rounded-xl p-8 sm:p-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-4xl mb-4">👥</div>
            <p className="text-slate-400">Nenhum cliente encontrado</p>
          </motion.div>
        ) : (
          <>
            {/* Mobile Cards */}
            <motion.div
              className="grid gap-4 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {clientesFiltrados.map((cliente, index) => (
                <motion.div
                  key={cliente.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/10 rounded-xl p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-medium">{cliente.user.nome}</p>
                      <p className="text-slate-500 text-sm">{cliente.user.email}</p>
                    </div>
                    <span className="text-green-400 font-bold text-sm">
                      {formatarMoeda(calcularTotalGasto(cliente))}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Telefone</span>
                      <a href={`tel:${cliente.user.telefone}`} className="text-cyan-400">
                        {cliente.user.telefone}
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CPF/CNPJ</span>
                      <span className="text-white">{cliente.cpfCnpj || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pedidos</span>
                      <span className="text-white">{cliente._count?.pedidos || cliente.pedidos?.length || 0}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-cyan-500/10">
                      <span className="text-slate-500">Cadastro</span>
                      <span className="text-slate-400 text-xs">{formatarDataHora(cliente.user.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Desktop Table */}
            <motion.div
              className="hidden md:block bg-slate-900/50 backdrop-blur-sm border border-cyan-500/10 rounded-xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-cyan-500/10">
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        CPF/CNPJ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Pedidos
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Total Gasto
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Cadastro
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-500/10">
                    {clientesFiltrados.map((cliente, index) => (
                      <motion.tr
                        key={cliente.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-cyan-500/5 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{cliente.user.nome}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{cliente.user.email}</div>
                          <div className="text-sm text-slate-500">{cliente.user.telefone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-400">{cliente.cpfCnpj || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {cliente._count?.pedidos || cliente.pedidos?.length || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-green-400">
                            {formatarMoeda(calcularTotalGasto(cliente))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {formatarDataHora(cliente.user.createdAt)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </main>
    </div>
  )
}
