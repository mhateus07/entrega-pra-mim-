'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { FaturamentoChart, PedidosPorDiaChart, StatusPedidosChart } from '@/components/charts/DashboardCharts'
import { formatarMoeda } from '@/lib/pricing'
import { LABELS_STATUS_PEDIDO, CORES_STATUS_PEDIDO } from '@/utils/helpers'
import { StatusPedido } from '@/types'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardStats {
  totalPedidos: number
  pedidosHoje: number
  entregasHoje: number
  faturamentoHoje: number
  pedidosPendentes: number
  motoboysAtivos: number
}

interface PedidoRecente {
  id: string
  status: StatusPedido
  tipoServico: string
  valorTotal: number
  createdAt: string
  cliente: {
    user: {
      nome: string
    }
  }
}

interface ChartData {
  faturamentoDiario: { data: string; valor: number; pedidos: number }[]
  pedidosPorDia: { dia: string; total: number }[]
  statusPedidos: { status: string; count: number }[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalPedidos: 0,
    pedidosHoje: 0,
    entregasHoje: 0,
    faturamentoHoje: 0,
    pedidosPendentes: 0,
    motoboysAtivos: 0,
  })
  const [pedidosRecentes, setPedidosRecentes] = useState<PedidoRecente[]>([])
  const [chartData, setChartData] = useState<ChartData>({
    faturamentoDiario: [],
    pedidosPorDia: [],
    statusPedidos: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar pedidos
        const pedidosRes = await fetch('/api/pedidos')
        const pedidosData = await pedidosRes.json()

        if (pedidosData.success) {
          const pedidos = pedidosData.data
          const hoje = new Date().toISOString().split('T')[0]

          const pedidosHoje = pedidos.filter(
            (p: PedidoRecente) => p.createdAt.split('T')[0] === hoje
          )
          const entregasHoje = pedidosHoje.filter(
            (p: PedidoRecente) => p.status === 'ENTREGUE'
          )
          const faturamentoHoje = entregasHoje.reduce(
            (acc: number, p: PedidoRecente) => acc + p.valorTotal,
            0
          )
          const pedidosPendentes = pedidos.filter(
            (p: PedidoRecente) => p.status === 'SOLICITADO'
          ).length

          setStats({
            totalPedidos: pedidos.length,
            pedidosHoje: pedidosHoje.length,
            entregasHoje: entregasHoje.length,
            faturamentoHoje,
            pedidosPendentes,
            motoboysAtivos: 0,
          })

          setPedidosRecentes(pedidos.slice(0, 5))

          // Calcular dados dos gráficos
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(new Date(), 6 - i)
            return format(date, 'yyyy-MM-dd')
          })

          const faturamentoDiario = last7Days.map(dateStr => {
            const dayPedidos = pedidos.filter(
              (p: PedidoRecente) => p.createdAt.split('T')[0] === dateStr && p.status === 'ENTREGUE'
            )
            return {
              data: format(new Date(dateStr), 'dd/MM', { locale: ptBR }),
              valor: dayPedidos.reduce((acc: number, p: PedidoRecente) => acc + p.valorTotal, 0),
              pedidos: dayPedidos.length,
            }
          })

          const pedidosPorDia = last7Days.map(dateStr => {
            const count = pedidos.filter(
              (p: PedidoRecente) => p.createdAt.split('T')[0] === dateStr
            ).length
            return {
              dia: format(new Date(dateStr), 'EEE', { locale: ptBR }),
              total: count,
            }
          })

          const statusCounts = pedidos.reduce((acc: Record<string, number>, p: PedidoRecente) => {
            const label = LABELS_STATUS_PEDIDO[p.status] || p.status
            acc[label] = (acc[label] || 0) + 1
            return acc
          }, {})

          const statusPedidos = Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count: count as number,
          }))

          setChartData({ faturamentoDiario, pedidosPorDia, statusPedidos })
        }

        // Buscar motoboys ativos
        const motoboysRes = await fetch('/api/motoboys?status=DISPONIVEL')
        const motoboysData = await motoboysRes.json()

        if (motoboysData.success) {
          setStats((prev) => ({
            ...prev,
            motoboysAtivos: motoboysData.data.length,
          }))
        }
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchData()
    }
  }, [status])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              <ThemeToggle />
              <Badge variant="info">{session?.user?.role}</Badge>
              <span className="text-gray-600">{session?.user?.name}</span>
              <Button variant="outline" onClick={handleLogout}>Sair</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <Link href="/dashboard" className="py-4 px-1 border-b-2 border-blue-600 text-blue-600 font-medium">
              Visão Geral
            </Link>
            <Link href="/dashboard/pedidos" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium">
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card variant="bordered">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Pedidos Hoje
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.pedidosHoje}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-green-600"
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
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Entregas Hoje
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.entregasHoje}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Faturamento Hoje
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatarMoeda(stats.faturamentoHoje)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Motoboys Ativos
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.motoboysAtivos}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Faturamento (Últimos 7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <FaturamentoChart data={chartData.faturamentoDiario} />
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Pedidos por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <PedidosPorDiaChart data={chartData.pedidosPorDia} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card variant="bordered" className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Status dos Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusPedidosChart data={chartData.statusPedidos} />
            </CardContent>
          </Card>

          <Card variant="bordered" className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{stats.totalPedidos}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total de Pedidos</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{stats.entregasHoje}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Entregas Hoje</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-yellow-600">{stats.pedidosPendentes}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pendentes</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{stats.motoboysAtivos}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Motoboys Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card variant="bordered">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pedidos Recentes</CardTitle>
            <Link href="/dashboard/pedidos">
              <Button variant="outline" size="sm">Ver Todos</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pedidosRecentes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhum pedido encontrado
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pedidosRecentes.map((pedido) => (
                      <Link key={pedido.id} href={`/dashboard/pedidos/${pedido.id}`} className="contents">
                        <tr className="hover:bg-gray-50 cursor-pointer">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {pedido.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pedido.cliente?.user?.nome || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {pedido.tipoServico}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatarMoeda(pedido.valorTotal)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                CORES_STATUS_PEDIDO[pedido.status]
                              }`}
                            >
                              {LABELS_STATUS_PEDIDO[pedido.status]}
                            </span>
                          </td>
                        </tr>
                      </Link>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
