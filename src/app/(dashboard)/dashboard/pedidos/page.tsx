'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
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
  const { data: session, status } = useSession()
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

  const statusOptions: (StatusPedido | 'TODOS')[] = ['TODOS', 'SOLICITADO', 'ACEITO', 'EM_COLETA', 'EM_ENTREGA', 'ENTREGUE', 'CANCELADO']

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Entrega Pra Mim</span>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="info">{session?.user?.role}</Badge>
              <span className="text-gray-600">{session?.user?.name}</span>
              <Button variant="outline" onClick={handleLogout}>Sair</Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <Link href="/dashboard" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
              Visão Geral
            </Link>
            <Link href="/dashboard/pedidos" className="py-4 px-1 border-b-2 border-blue-600 text-blue-600 font-medium">
              Pedidos
            </Link>
            <Link href="/dashboard/motoboys" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
              Motoboys
            </Link>
            <Link href="/dashboard/clientes" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
              Clientes
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600">{pedidosFiltrados.length} pedidos encontrados</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statusOptions.map((statusOption) => (
            <button
              key={statusOption}
              onClick={() => setFiltroStatus(statusOption)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroStatus === statusOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {statusOption === 'TODOS' ? 'Todos' : LABELS_STATUS_PEDIDO[statusOption]}
              {statusOption !== 'TODOS' && (
                <span className="ml-2 text-xs">
                  ({pedidos.filter(p => p.status === statusOption).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista de pedidos */}
        {pedidosFiltrados.length === 0 ? (
          <Card variant="bordered">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Nenhum pedido encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motoboy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pedidosFiltrados.map((pedido) => (
                  <Link key={pedido.id} href={`/dashboard/pedidos/${pedido.id}`} className="contents">
                    <tr className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">#{pedido.id.slice(0, 8)}</div>
                        <div className="text-xs text-gray-500">{pedido.tipoServico}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{pedido.cliente.user.nome}</div>
                        <div className="text-xs text-gray-500">{pedido.cliente.user.telefone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {pedido.enderecoOrigem.bairro} → {pedido.enderecoDestino.bairro}
                        </div>
                        <div className="text-xs text-gray-500">{pedido.distanciaKm.toFixed(1)} km</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {pedido.motoboy ? (
                          <div className="text-sm text-gray-900">{pedido.motoboy.user.nome}</div>
                        ) : (
                          <span className="text-sm text-gray-400">Não atribuído</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatarMoeda(pedido.valorTotal)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${CORES_STATUS_PEDIDO[pedido.status]}`}>
                          {LABELS_STATUS_PEDIDO[pedido.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatarDataHora(pedido.createdAt)}
                      </td>
                    </tr>
                  </Link>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
