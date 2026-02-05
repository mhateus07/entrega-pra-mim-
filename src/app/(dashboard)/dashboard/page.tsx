'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 relative">
            <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
          </div>
          <p className="text-cyan-400 text-sm">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  const navLinks = [
    { href: '/dashboard', label: 'Visao Geral', active: true },
    { href: '/dashboard/pedidos', label: 'Pedidos', active: false },
    { href: '/dashboard/motoboys', label: 'Motoboys', active: false },
    { href: '/dashboard/clientes', label: 'Clientes', active: false },
  ]

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.header
        className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-cyan-500/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <motion.div
                className="w-10 h-10 relative rounded-xl overflow-hidden ring-2 ring-cyan-500/30 group-hover:ring-cyan-400/60 transition-all"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Image src="/icons/app-icon.png" alt="Entrega Pra Mim" fill className="object-cover" />
              </motion.div>
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                ENTREGA PRA MIM
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Badge variant="info" className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {session?.user?.role}
              </Badge>
              <span className="text-slate-400 text-sm hidden sm:block">{session?.user?.name}</span>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Navigation */}
      <nav className="sticky top-[73px] z-40 bg-slate-900/60 backdrop-blur-xl border-b border-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all ${
                  link.active
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {[
            { label: 'Pedidos Hoje', value: stats.pedidosHoje, icon: '📦', color: 'cyan' },
            { label: 'Entregas Hoje', value: stats.entregasHoje, icon: '✅', color: 'green' },
            { label: 'Faturamento Hoje', value: formatarMoeda(stats.faturamentoHoje), icon: '💰', color: 'yellow' },
            { label: 'Motoboys Ativos', value: stats.motoboysAtivos, icon: '🏍️', color: 'purple' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <Card className="bg-slate-900/50 border-cyan-500/10 hover:border-cyan-500/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-2xl">
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Section */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-slate-900/50 border-cyan-500/10">
            <CardHeader>
              <CardTitle className="text-white">Faturamento (Ultimos 7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <FaturamentoChart data={chartData.faturamentoDiario} />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-cyan-500/10">
            <CardHeader>
              <CardTitle className="text-white">Pedidos por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <PedidosPorDiaChart data={chartData.pedidosPorDia} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="lg:col-span-1 bg-slate-900/50 border-cyan-500/10">
            <CardHeader>
              <CardTitle className="text-white">Status dos Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusPedidosChart data={chartData.statusPedidos} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-slate-900/50 border-cyan-500/10">
            <CardHeader>
              <CardTitle className="text-white">Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total de Pedidos', value: stats.totalPedidos, color: 'cyan' },
                  { label: 'Entregas Hoje', value: stats.entregasHoje, color: 'green' },
                  { label: 'Pendentes', value: stats.pedidosPendentes, color: 'yellow' },
                  { label: 'Motoboys Ativos', value: stats.motoboysAtivos, color: 'purple' },
                ].map((item) => (
                  <div key={item.label} className="text-center p-4 bg-slate-800/50 rounded-xl border border-cyan-500/10">
                    <p className="text-3xl font-bold text-cyan-400">{item.value}</p>
                    <p className="text-sm text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-slate-900/50 border-cyan-500/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Pedidos Recentes</CardTitle>
              <Link href="/dashboard/pedidos">
                <Button variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                  Ver Todos
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pedidosRecentes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-slate-400">Nenhum pedido encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-cyan-500/10">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-500/10">
                      {pedidosRecentes.map((pedido) => (
                        <Link key={pedido.id} href={`/dashboard/pedidos/${pedido.id}`} className="contents">
                          <tr className="hover:bg-cyan-500/5 cursor-pointer transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-cyan-400">
                              {pedido.id.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                              {pedido.cliente?.user?.nome || 'N/A'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                              {pedido.tipoServico}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                              {formatarMoeda(pedido.valorTotal)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span
                                className={`px-3 py-1 text-xs font-medium rounded-full ${
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
        </motion.div>
      </main>
    </div>
  )
}
