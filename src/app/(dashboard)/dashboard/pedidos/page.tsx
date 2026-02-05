'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { formatarMoeda } from '@/lib/pricing'
import { LABELS_STATUS_PEDIDO, CORES_STATUS_PEDIDO, formatarDataHora } from '@/utils/helpers'
import { StatusPedido } from '@/types'

interface Pedido {
  id: string
  status: StatusPedido
  tipoServico: string
  valorTotal: number
  distanciaKm: number
  createdAt: string
  cliente: {
    user: {
      nome: string
      telefone: string
    }
  }
  motoboy: {
    user: {
      nome: string
    }
  } | null
  enderecoOrigem: {
    bairro: string
    cidade: string
  }
  enderecoDestino: {
    bairro: string
    cidade: string
  }
}

export default function PedidosAdminPage() {
  const { status } = useSession()
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<StatusPedido | 'TODOS'>('TODOS')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const response = await fetch('/api/pedidos')
        const data = await response.json()

        if (data.success) {
          setPedidos(data.data)
        }
      } catch (error) {
        console.error('Erro ao carregar pedidos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchPedidos()
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
          <p className="text-cyan-400 text-sm">Carregando pedidos...</p>
        </div>
      </div>
    )
  }

  const pedidosFiltrados = filtroStatus === 'TODOS'
    ? pedidos
    : pedidos.filter(p => p.status === filtroStatus)

  const statusOptions: (StatusPedido | 'TODOS')[] = ['TODOS', 'SOLICITADO', 'ACEITO', 'EM_COLETA', 'EM_ENTREGA', 'ENTREGUE', 'CANCELADO']

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <DashboardHeader activeTab="pedidos" />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-xl sm:text-2xl font-bold text-white">Pedidos</h1>
          <p className="text-slate-400 text-sm">{pedidosFiltrados.length} pedidos encontrados</p>
        </motion.div>

        {/* Filtros */}
        <motion.div
          className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {statusOptions.map((statusOption) => (
            <button
              key={statusOption}
              onClick={() => setFiltroStatus(statusOption)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                filtroStatus === statusOption
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-cyan-500/20 hover:bg-slate-800 hover:text-white hover:border-cyan-500/40'
              }`}
            >
              {statusOption === 'TODOS' ? 'Todos' : LABELS_STATUS_PEDIDO[statusOption]}
              {statusOption !== 'TODOS' && (
                <span className="ml-1 sm:ml-2 text-xs opacity-70">
                  ({pedidos.filter(p => p.status === statusOption).length})
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Lista de pedidos */}
        {pedidosFiltrados.length === 0 ? (
          <motion.div
            className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/10 rounded-xl p-8 sm:p-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-4xl mb-4">📭</div>
            <p className="text-slate-400">Nenhum pedido encontrado</p>
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
              {pedidosFiltrados.map((pedido, index) => (
                <motion.div
                  key={pedido.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => router.push(`/dashboard/pedidos/${pedido.id}`)}
                  className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/10 rounded-xl p-4 cursor-pointer hover:border-cyan-500/30 transition-all active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-sm font-mono text-cyan-400">#{pedido.id.slice(0, 8)}</span>
                      <span className="ml-2 text-xs text-slate-500">{pedido.tipoServico}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${CORES_STATUS_PEDIDO[pedido.status]}`}>
                      {LABELS_STATUS_PEDIDO[pedido.status]}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cliente</span>
                      <span className="text-white">{pedido.cliente.user.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rota</span>
                      <span className="text-white text-right">{pedido.enderecoOrigem.bairro} → {pedido.enderecoDestino.bairro}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Motoboy</span>
                      <span className="text-white">{pedido.motoboy?.user.nome || '-'}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-cyan-500/10">
                      <span className="text-slate-500">{formatarDataHora(pedido.createdAt)}</span>
                      <span className="text-white font-bold">{formatarMoeda(pedido.valorTotal)}</span>
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
                        Pedido
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Rota
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Motoboy
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-500/10">
                    {pedidosFiltrados.map((pedido, index) => (
                      <motion.tr
                        key={pedido.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-cyan-500/5 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/pedidos/${pedido.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-cyan-400">#{pedido.id.slice(0, 8)}</div>
                          <div className="text-xs text-slate-500">{pedido.tipoServico}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{pedido.cliente.user.nome}</div>
                          <div className="text-xs text-slate-500">{pedido.cliente.user.telefone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white">
                            {pedido.enderecoOrigem.bairro} → {pedido.enderecoDestino.bairro}
                          </div>
                          <div className="text-xs text-slate-500">{pedido.distanciaKm.toFixed(1)} km</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {pedido.motoboy ? (
                            <div className="text-sm text-white">{pedido.motoboy.user.nome}</div>
                          ) : (
                            <span className="text-sm text-slate-500">Não atribuído</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{formatarMoeda(pedido.valorTotal)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${CORES_STATUS_PEDIDO[pedido.status]}`}>
                            {LABELS_STATUS_PEDIDO[pedido.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {formatarDataHora(pedido.createdAt)}
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
