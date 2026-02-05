'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Header from '@/components/ui/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatarMoeda } from '@/lib/pricing'
import { LABELS_STATUS_PEDIDO, CORES_STATUS_PEDIDO, LABELS_STATUS_MOTOBOY, CORES_STATUS_MOTOBOY } from '@/utils/helpers'
import { StatusPedido, StatusMotoboy } from '@/types'
import { useLocationSharing } from '@/hooks/useTracking'
import { useNotifications } from '@/hooks/useNotifications'
import toast from 'react-hot-toast'

interface Pedido {
  id: string
  status: StatusPedido
  tipoServico: string
  valorTotal: number
  distanciaKm: number
  duracaoEstimada: number
  createdAt: string
  cliente: {
    user: {
      nome: string
      telefone: string
    }
  }
  enderecoOrigem: {
    logradouro: string
    numero: string
    bairro: string
    cidade: string
    latitude: number
    longitude: number
  }
  enderecoDestino: {
    logradouro: string
    numero: string
    bairro: string
    cidade: string
    latitude: number
    longitude: number
  }
}

interface MotoboyInfo {
  id: string
  status: StatusMotoboy
  avaliacaoMedia: number
  totalEntregas: number
}

interface SaldoInfo {
  saldoDisponivel: number
  saldoPendente: number
  totalRecebido: number
}

export default function MotoboyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [motoboy, setMotoboy] = useState<MotoboyInfo | null>(null)
  const [saldo, setSaldo] = useState<SaldoInfo | null>(null)
  const [pedidoAtual, setPedidoAtual] = useState<Pedido | null>(null)
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState<Pedido[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Hooks de localização e notificação
  const { permission, requestPermission, notifyNewOrder } = useNotifications()
  const isDelivering = pedidoAtual && !['ENTREGUE', 'CANCELADO'].includes(pedidoAtual.status)
  const { isSharing, error: locationError } = useLocationSharing(
    motoboy?.id || null,
    !!isDelivering
  )

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Solicitar permissão de notificação ao carregar
  useEffect(() => {
    if (permission === 'default' && motoboy) {
      requestPermission()
    }
  }, [permission, motoboy, requestPermission])

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.motoboyId) return

      try {
        // Buscar dados do motoboy
        const motoboyRes = await fetch(`/api/motoboys/${session.user.motoboyId}`)
        const motoboyData = await motoboyRes.json()

        if (motoboyData.success) {
          setMotoboy(motoboyData.data)
        }

        // Buscar saldo do motoboy
        const saldoRes = await fetch(`/api/motoboys/${session.user.motoboyId}/saldo`)
        const saldoData = await saldoRes.json()

        if (saldoData.success) {
          setSaldo(saldoData.data)
        }

        // Buscar pedidos do motoboy
        const pedidosRes = await fetch(
          `/api/pedidos?motoboyId=${session.user.motoboyId}`
        )
        const pedidosData = await pedidosRes.json()

        if (pedidosData.success) {
          const pedidoEmAndamento = pedidosData.data.find(
            (p: Pedido) => !['ENTREGUE', 'CANCELADO', 'SOLICITADO'].includes(p.status)
          )
          setPedidoAtual(pedidoEmAndamento || null)
        }

        // Buscar pedidos disponíveis (se estiver disponível)
        if (motoboyData.data?.status === 'DISPONIVEL') {
          const dispRes = await fetch('/api/pedidos?status=SOLICITADO')
          const dispData = await dispRes.json()

          if (dispData.success) {
            setPedidosDisponiveis(dispData.data)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchData()
    }
  }, [status, session])

  // Polling para novos pedidos quando disponível
  useEffect(() => {
    if (!motoboy || motoboy.status !== 'DISPONIVEL' || pedidoAtual) return

    const pollNewOrders = async () => {
      try {
        const response = await fetch('/api/pedidos?status=SOLICITADO')
        const data = await response.json()

        if (data.success) {
          // Verificar se há novos pedidos
          const novosIds = data.data.map((p: Pedido) => p.id)
          const antigosIds = pedidosDisponiveis.map((p) => p.id)
          const novosPedidos = novosIds.filter((id: string) => !antigosIds.includes(id))

          if (novosPedidos.length > 0 && pedidosDisponiveis.length > 0) {
            const primeiroPedido = data.data.find((p: Pedido) => p.id === novosPedidos[0])
            if (primeiroPedido) {
              notifyNewOrder(primeiroPedido.valorTotal, primeiroPedido.enderecoOrigem.bairro)
            }
          }

          setPedidosDisponiveis(data.data)
        }
      } catch (error) {
        console.error('Erro ao buscar novos pedidos:', error)
      }
    }

    const interval = setInterval(pollNewOrders, 10000) // A cada 10 segundos

    return () => clearInterval(interval)
  }, [motoboy, pedidoAtual, pedidosDisponiveis, notifyNewOrder])

  const handleToggleStatus = async () => {
    if (!motoboy) return

    setIsUpdatingStatus(true)
    const novoStatus: StatusMotoboy =
      motoboy.status === 'DISPONIVEL' ? 'OFFLINE' : 'DISPONIVEL'

    try {
      const response = await fetch(`/api/motoboys/${motoboy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })

      const data = await response.json()

      if (data.success) {
        setMotoboy({ ...motoboy, status: novoStatus })

        if (novoStatus === 'DISPONIVEL') {
          toast.success('Você está online! Aguardando pedidos...')
          // Recarregar pedidos disponíveis
          const dispRes = await fetch('/api/pedidos?status=SOLICITADO')
          const dispData = await dispRes.json()

          if (dispData.success) {
            setPedidosDisponiveis(dispData.data)
          }
        } else {
          toast('Você está offline', { icon: '🔴' })
          setPedidosDisponiveis([])
        }
      } else {
        toast.error(data.error || 'Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleAceitarPedido = async (pedidoId: string) => {
    if (!motoboy) return

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ACEITO',
          motoboyId: motoboy.id,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPedidoAtual(data.data)
        setPedidosDisponiveis([])
        setMotoboy({ ...motoboy, status: 'EM_ENTREGA' })
        toast.success('Pedido aceito! Vá até o local de coleta.')
      } else {
        toast.error(data.error || 'Erro ao aceitar pedido')
      }
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error)
      toast.error('Erro ao aceitar pedido')
    }
  }

  const handleAtualizarStatusPedido = async (novoStatus: StatusPedido) => {
    if (!pedidoAtual) return

    const statusMessages: Record<StatusPedido, string> = {
      ACEITO: 'Pedido aceito!',
      EM_COLETA: 'Coleta iniciada! Vá até o local.',
      EM_ENTREGA: 'Entrega iniciada! A caminho do destino.',
      ENTREGUE: 'Entrega confirmada! Parabéns!',
      SOLICITADO: '',
      CANCELADO: '',
    }

    try {
      const response = await fetch(`/api/pedidos/${pedidoAtual.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(statusMessages[novoStatus] || 'Status atualizado!')

        if (novoStatus === 'ENTREGUE') {
          setPedidoAtual(null)
          setMotoboy((prev) =>
            prev
              ? { ...prev, status: 'DISPONIVEL', totalEntregas: prev.totalEntregas + 1 }
              : null
          )

          // Recarregar pedidos disponíveis
          const dispRes = await fetch('/api/pedidos?status=SOLICITADO')
          const dispData = await dispRes.json()

          if (dispData.success) {
            setPedidosDisponiveis(dispData.data)
          }
        } else {
          setPedidoAtual(data.data)
        }
      } else {
        toast.error(data.error || 'Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error)
      toast.error('Erro ao atualizar status do pedido')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const getNextStatus = (currentStatus: StatusPedido): StatusPedido | null => {
    const flow: Record<StatusPedido, StatusPedido | null> = {
      SOLICITADO: 'ACEITO',
      ACEITO: 'EM_COLETA',
      EM_COLETA: 'EM_ENTREGA',
      EM_ENTREGA: 'ENTREGUE',
      ENTREGUE: null,
      CANCELADO: null,
    }
    return flow[currentStatus]
  }

  const getNextStatusLabel = (currentStatus: StatusPedido): string | null => {
    const labels: Record<StatusPedido, string | null> = {
      SOLICITADO: 'Aceitar',
      ACEITO: 'Iniciar Coleta',
      EM_COLETA: 'Iniciar Entrega',
      EM_ENTREGA: 'Confirmar Entrega',
      ENTREGUE: null,
      CANCELADO: null,
    }
    return labels[currentStatus]
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header userName={session?.user?.name} userRole="MOTOBOY" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Location Sharing Status */}
        {isSharing && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-700 dark:text-green-300 text-sm font-medium">
              Compartilhando localização em tempo real
            </span>
          </div>
        )}

        {locationError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {locationError}
          </div>
        )}

        {/* Status and Earnings Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Status Card */}
          <Card variant="bordered">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Seu Status
                  </h2>
                  <div className="space-y-2">
                    <span
                      className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                        motoboy ? CORES_STATUS_MOTOBOY[motoboy.status] : ''
                      }`}
                    >
                      {motoboy ? LABELS_STATUS_MOTOBOY[motoboy.status] : 'Carregando...'}
                    </span>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>{motoboy?.totalEntregas || 0} entregas</span>
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        {motoboy?.avaliacaoMedia.toFixed(1) || '5.0'}
                      </span>
                    </div>
                  </div>
                </div>
                {motoboy?.status !== 'EM_ENTREGA' && (
                  <Button
                    variant={motoboy?.status === 'DISPONIVEL' ? 'danger' : 'primary'}
                    onClick={handleToggleStatus}
                    isLoading={isUpdatingStatus}
                    size="sm"
                  >
                    {motoboy?.status === 'DISPONIVEL' ? 'Ficar Offline' : 'Ficar Online'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Earnings Card */}
          <Card variant="bordered">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Seus Ganhos
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Disponível</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatarMoeda(saldo?.saldoDisponivel || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pendente</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatarMoeda(saldo?.saldoPendente || 0)}
                  </p>
                </div>
                <div className="col-span-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Recebido</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatarMoeda(saldo?.totalRecebido || 0)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/motoboy/ganhos">
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Detalhes
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Order */}
        {pedidoAtual && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Entrega Atual
            </h2>
            <Card variant="bordered">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          CORES_STATUS_PEDIDO[pedidoAtual.status]
                        }`}
                      >
                        {LABELS_STATUS_PEDIDO[pedidoAtual.status]}
                      </span>
                      <Badge variant="info" size="sm">
                        {pedidoAtual.tipoServico}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatarMoeda(pedidoAtual.valorTotal)}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 uppercase mb-1 font-medium">
                      Coleta
                    </p>
                    <p className="text-sm text-gray-900 font-medium">
                      {pedidoAtual.enderecoOrigem.logradouro},{' '}
                      {pedidoAtual.enderecoOrigem.numero}
                    </p>
                    <p className="text-sm text-gray-600">
                      {pedidoAtual.enderecoOrigem.bairro},{' '}
                      {pedidoAtual.enderecoOrigem.cidade}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600 uppercase mb-1 font-medium">
                      Entrega
                    </p>
                    <p className="text-sm text-gray-900 font-medium">
                      {pedidoAtual.enderecoDestino.logradouro},{' '}
                      {pedidoAtual.enderecoDestino.numero}
                    </p>
                    <p className="text-sm text-gray-600">
                      {pedidoAtual.enderecoDestino.bairro},{' '}
                      {pedidoAtual.enderecoDestino.cidade}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase mb-1">Cliente</p>
                  <p className="text-sm text-gray-900">
                    {pedidoAtual.cliente.user.nome}
                  </p>
                  <p className="text-sm text-gray-600">
                    {pedidoAtual.cliente.user.telefone}
                  </p>
                </div>

                {getNextStatus(pedidoAtual.status) && (
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={() =>
                        handleAtualizarStatusPedido(getNextStatus(pedidoAtual.status)!)
                      }
                    >
                      {getNextStatusLabel(pedidoAtual.status)}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Available Orders */}
        {!pedidoAtual && motoboy?.status === 'DISPONIVEL' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Pedidos Disponíveis
            </h2>
            {pedidosDisponiveis.length === 0 ? (
              <Card variant="bordered">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">
                    Nenhum pedido disponivel no momento
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pedidosDisponiveis.map((pedido) => (
                  <Card key={pedido.id} variant="bordered">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <Badge variant="info" size="sm">
                            {pedido.tipoServico}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            {pedido.distanciaKm.toFixed(1)} km -{' '}
                            {pedido.duracaoEstimada} min
                          </p>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {formatarMoeda(pedido.valorTotal)}
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">
                            Coleta
                          </p>
                          <p className="text-sm text-gray-900">
                            {pedido.enderecoOrigem.bairro}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-1">
                            Entrega
                          </p>
                          <p className="text-sm text-gray-900">
                            {pedido.enderecoDestino.bairro}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={() => handleAceitarPedido(pedido.id)}>
                          Aceitar Entrega
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Offline Message */}
        {!pedidoAtual && motoboy?.status === 'OFFLINE' && (
          <Card variant="bordered">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">
                Voce esta offline. Fique online para receber pedidos.
              </p>
              <Button onClick={handleToggleStatus} isLoading={isUpdatingStatus}>
                Ficar Online
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
