'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
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
  entregueEm: string | null
  cliente: {
    user: {
      nome: string
    }
  }
  enderecoOrigem: {
    bairro: string
    cidade: string
  }
  enderecoDestino: {
    bairro: string
    cidade: string
  }
  avaliacao: {
    nota: number
    comentario: string | null
  } | null
}

interface Stats {
  totalEntregas: number
  ganhoTotal: number
  avaliacaoMedia: number
}

export default function HistoricoMotoboyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [stats, setStats] = useState<Stats>({ totalEntregas: 0, ganhoTotal: 0, avaliacaoMedia: 5.0 })
  const [isLoading, setIsLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ENTREGUE' | 'CANCELADO'>('TODOS')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchHistorico = async () => {
      if (!session?.user?.motoboyId) return

      try {
        const response = await fetch(`/api/pedidos?motoboyId=${session.user.motoboyId}`)
        const data = await response.json()

        if (data.success) {
          const pedidosFinalizados = data.data.filter(
            (p: Pedido) => ['ENTREGUE', 'CANCELADO'].includes(p.status)
          )
          setPedidos(pedidosFinalizados)

          // Calcular estatísticas
          const entregues = pedidosFinalizados.filter((p: Pedido) => p.status === 'ENTREGUE')
          const ganhoTotal = entregues.reduce((acc: number, p: Pedido) => acc + p.valorTotal, 0)
          const avaliacoes = entregues
            .filter((p: Pedido) => p.avaliacao)
            .map((p: Pedido) => p.avaliacao!.nota)
          const avaliacaoMedia = avaliacoes.length > 0
            ? avaliacoes.reduce((a: number, b: number) => a + b, 0) / avaliacoes.length
            : 5.0

          setStats({
            totalEntregas: entregues.length,
            ganhoTotal,
            avaliacaoMedia,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar historico:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchHistorico()
    }
  }, [status, session])

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const pedidosFiltrados = filtroStatus === 'TODOS'
    ? pedidos
    : pedidos.filter(p => p.status === filtroStatus)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/motoboy" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Histórico de Entregas</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{session?.user?.name}</span>
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{stats.totalEntregas}</p>
              <p className="text-sm text-gray-500">Entregas Realizadas</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{formatarMoeda(stats.ganhoTotal)}</p>
              <p className="text-sm text-gray-500">Ganho Total</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-500">
                {stats.avaliacaoMedia.toFixed(1)} <span className="text-xl">★</span>
              </p>
              <p className="text-sm text-gray-500">Avaliação Média</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFiltroStatus('TODOS')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtroStatus === 'TODOS'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Todos ({pedidos.length})
          </button>
          <button
            onClick={() => setFiltroStatus('ENTREGUE')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtroStatus === 'ENTREGUE'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Entregues ({pedidos.filter(p => p.status === 'ENTREGUE').length})
          </button>
          <button
            onClick={() => setFiltroStatus('CANCELADO')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtroStatus === 'CANCELADO'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Cancelados ({pedidos.filter(p => p.status === 'CANCELADO').length})
          </button>
        </div>

        {/* Lista de pedidos */}
        {pedidosFiltrados.length === 0 ? (
          <Card variant="bordered">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Nenhuma entrega encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pedidosFiltrados.map((pedido) => (
              <Link key={pedido.id} href={`/motoboy/pedido/${pedido.id}`}>
                <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              CORES_STATUS_PEDIDO[pedido.status]
                            }`}
                          >
                            {LABELS_STATUS_PEDIDO[pedido.status]}
                          </span>
                          <Badge variant="info" size="sm">
                            {pedido.tipoServico}
                          </Badge>
                          {pedido.avaliacao && (
                            <span className="text-yellow-500 text-sm">
                              {pedido.avaliacao.nota} ★
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900">
                          {pedido.enderecoOrigem.bairro} → {pedido.enderecoDestino.bairro}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatarDataHora(pedido.entregueEm || pedido.createdAt)}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-bold text-gray-900">{formatarMoeda(pedido.valorTotal)}</p>
                          <p className="text-xs text-gray-500">{pedido.distanciaKm.toFixed(1)} km</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
