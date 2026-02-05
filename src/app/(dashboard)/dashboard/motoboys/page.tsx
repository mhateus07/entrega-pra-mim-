'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { LABELS_STATUS_MOTOBOY, CORES_STATUS_MOTOBOY } from '@/utils/helpers'
import { StatusMotoboy } from '@/types'

interface Motoboy {
  id: string
  status: StatusMotoboy
  avaliacaoMedia: number
  totalEntregas: number
  cnh: string
  veiculoModelo: string
  veiculoPlaca: string
  user: {
    nome: string
    email: string
    telefone: string
  }
  _count?: {
    pedidos: number
  }
}

export default function MotoboysAdminPage() {
  const { status } = useSession()
  const router = useRouter()
  const [motoboys, setMotoboys] = useState<Motoboy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<StatusMotoboy | 'TODOS'>('TODOS')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchMotoboys = async () => {
      try {
        const response = await fetch('/api/motoboys')
        const data = await response.json()

        if (data.success) {
          setMotoboys(data.data)
        }
      } catch (error) {
        console.error('Erro ao carregar motoboys:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchMotoboys()
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
          <p className="text-cyan-400 text-sm">Carregando motoboys...</p>
        </div>
      </div>
    )
  }

  const motoboysFiltrados = filtroStatus === 'TODOS'
    ? motoboys
    : motoboys.filter(m => m.status === filtroStatus)

  const statusOptions: (StatusMotoboy | 'TODOS')[] = ['TODOS', 'DISPONIVEL', 'EM_ENTREGA', 'OFFLINE']

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <DashboardHeader activeTab="motoboys" />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="flex justify-between items-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-white">Motoboys</h1>
          <p className="text-slate-400">{motoboysFiltrados.length} motoboys encontrados</p>
        </motion.div>

        {/* Estatísticas */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-slate-900/50 border-cyan-500/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-white">{motoboys.length}</p>
              <p className="text-sm text-slate-400">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-cyan-500/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{motoboys.filter(m => m.status === 'DISPONIVEL').length}</p>
              <p className="text-sm text-slate-400">Disponíveis</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-cyan-500/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-cyan-400">{motoboys.filter(m => m.status === 'EM_ENTREGA').length}</p>
              <p className="text-sm text-slate-400">Em Entrega</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-cyan-500/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-slate-500">{motoboys.filter(m => m.status === 'OFFLINE').length}</p>
              <p className="text-sm text-slate-400">Offline</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filtros */}
        <motion.div
          className="flex flex-wrap gap-2 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {statusOptions.map((statusOption) => (
            <button
              key={statusOption}
              onClick={() => setFiltroStatus(statusOption)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtroStatus === statusOption
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-cyan-500/20 hover:bg-slate-800 hover:text-white hover:border-cyan-500/40'
              }`}
            >
              {statusOption === 'TODOS' ? 'Todos' : LABELS_STATUS_MOTOBOY[statusOption]}
            </button>
          ))}
        </motion.div>

        {/* Lista */}
        {motoboysFiltrados.length === 0 ? (
          <motion.div
            className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/10 rounded-xl p-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-4xl mb-4">🏍️</div>
            <p className="text-slate-400">Nenhum motoboy encontrado</p>
          </motion.div>
        ) : (
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {motoboysFiltrados.map((motoboy, index) => (
              <motion.div
                key={motoboy.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -5 }}
              >
                <Card className="bg-slate-900/50 border-cyan-500/10 hover:border-cyan-500/30 transition-all h-full">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-white">{motoboy.user.nome}</p>
                        <p className="text-sm text-slate-400">{motoboy.user.email}</p>
                        <p className="text-sm text-slate-400">{motoboy.user.telefone}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${CORES_STATUS_MOTOBOY[motoboy.status]}`}>
                        {LABELS_STATUS_MOTOBOY[motoboy.status]}
                      </span>
                    </div>

                    <div className="border-t border-cyan-500/10 pt-4 mt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Avaliação</p>
                          <p className="font-medium text-white flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            {motoboy.avaliacaoMedia.toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Entregas</p>
                          <p className="font-medium text-white">{motoboy.totalEntregas}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Veículo</p>
                          <p className="font-medium text-white text-xs">{motoboy.veiculoModelo}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Placa</p>
                          <p className="font-medium text-cyan-400">{motoboy.veiculoPlaca}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  )
}
