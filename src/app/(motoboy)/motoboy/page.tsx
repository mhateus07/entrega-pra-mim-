'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import Pagination from '@/components/ui/Pagination'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Inbox, Navigation, Phone, Power, Radio, RefreshCw, Star } from 'lucide-react'
import Button, { buttonClass } from '@/components/ui/Button'
import Header from '@/components/ui/Header'
import Badge from '@/components/ui/Badge'
import { Alert, EmptyState, FullPageLoader } from '@/components/ui/Feedback'
import { PedidoStatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/utils/cn'
import TrackingMap from '@/components/maps/TrackingMap'
import { formatarMoeda } from '@/lib/pricing'
import { LABELS_TIPO_SERVICO, codigoPedido } from '@/utils/helpers'
import type { StatusPedido, StatusMotoboy, TipoServico } from '@prisma/client'
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
  const list = usePaginatedList<Pedido>(motoboy?.status === 'DISPONIVEL' && !pedidoAtual ? '/api/pedidos?status=SOLICITADO' : null, 10000)
  const pedidosDisponiveis = list.data
  const previousAvailable = useRef<{ page: number; ids: string[] } | null>(null)
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
          `/api/pedidos?motoboyId=${session.user.motoboyId}&grupo=ativos&limit=1`
        )
        const pedidosData = await pedidosRes.json()

        if (pedidosData.success) {
          const pedidoEmAndamento = pedidosData.data.find(
            (p: Pedido) => !['ENTREGUE', 'CANCELADO', 'SOLICITADO'].includes(p.status)
          )
          setPedidoAtual(pedidoEmAndamento || null)
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

  useEffect(() => {
    if (list.loading) return
    const previous = previousAvailable.current
    if (list.pagination.page === 1 && previous?.page === 1 && previous.ids.length) {
      const novo = pedidosDisponiveis.find(p => !previous.ids.includes(p.id))
      if (novo) notifyNewOrder(novo.valorTotal, novo.enderecoOrigem.bairro)
    }
    previousAvailable.current = { page: list.pagination.page, ids: pedidosDisponiveis.map(p => p.id) }
  }, [pedidosDisponiveis, list.loading, list.pagination.page, notifyNewOrder])

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
          toast.success('Você está online. Novos pedidos aparecerão aqui.')
        } else {
          toast('Você está offline')
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
        setMotoboy({ ...motoboy, status: 'EM_ENTREGA' })
        toast.success('Pedido aceito. Siga para o local de coleta.')
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
    if (novoStatus === 'ENTREGUE') {
      window.location.href = `/motoboy/pedido/${pedidoAtual.id}`
      return
    }

    const statusMessages: Record<StatusPedido, string> = {
      ACEITO: 'Pedido aceito',
      EM_COLETA: 'Coleta iniciada',
      EM_ENTREGA: 'Item coletado. Siga para o destino.',
      ENTREGUE: 'Entrega confirmada',
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
        toast.success(statusMessages[novoStatus] || 'Status atualizado')

        setPedidoAtual(data.data)
      } else {
        toast.error(data.error || 'Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error)
      toast.error('Erro ao atualizar status do pedido')
    }
  }

  if (status === 'loading' || isLoading) return <FullPageLoader />

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
      ACEITO: 'Cheguei na coleta',
      EM_COLETA: 'Item coletado, iniciar entrega',
      EM_ENTREGA: 'Confirmar entrega',
      ENTREGUE: null,
      CANCELADO: null,
    }
    return labels[currentStatus]
  }

  const online = motoboy?.status === 'DISPONIVEL' || motoboy?.status === 'EM_ENTREGA'

  const enderecoBloco = (tipo: 'coleta' | 'entrega', e: Pedido['enderecoOrigem']) => (
    <div className="flex gap-3">
      {tipo === 'coleta'
        ? <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-fg" aria-hidden="true" />
        : <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-fg-3">{tipo === 'coleta' ? 'Coleta' : 'Entrega'}</p>
        <p className="text-sm font-medium text-fg">
          {e.logradouro ? `${e.logradouro}${e.numero ? `, ${e.numero}` : ''}` : e.bairro}
        </p>
        <p className="text-[13px] text-fg-3">{e.bairro}, {e.cidade}</p>
      </div>
      {e.latitude && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${e.latitude},${e.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass('outline', 'sm', 'shrink-0')}
        >
          <Navigation className="h-3.5 w-3.5" /> Rota
        </a>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-page">
      <Header userName={session?.user?.name} userRole="MOTOBOY" />

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        {/* Status */}
        <section className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />}
              <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', online ? 'bg-success' : 'bg-fg-3')} />
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">{motoboy ? (motoboy.status === 'EM_ENTREGA' ? 'Em entrega' : online ? 'Online' : 'Offline') : '—'}</p>
              <p className="text-xs text-fg-3">
                {motoboy?.status === 'EM_ENTREGA' ? 'Conclua a entrega atual para receber novos pedidos' : online ? 'Recebendo pedidos' : 'Você não está recebendo pedidos'}
              </p>
            </div>
          </div>
          {motoboy?.status !== 'EM_ENTREGA' && (
            <button
              type="button"
              role="switch"
              aria-checked={online}
              aria-label="Ficar online"
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus || !motoboy}
              className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50', online ? 'bg-success' : 'bg-surface-3')}
            >
              <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', online ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          )}
        </section>

        {isSharing && (
          <Alert variant="success" icon={Radio}>Sua localização está sendo compartilhada com o cliente durante a entrega.</Alert>
        )}
        {locationError && <Alert variant="danger" icon={AlertTriangle}>{locationError}</Alert>}

        {/* Ganhos */}
        <section className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <div className="p-4">
            <p className="text-xs text-fg-3">Disponível</p>
            <p className="mt-1 text-lg font-semibold tabular text-fg">{formatarMoeda(saldo?.saldoDisponivel || 0)}</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-fg-3">A liberar</p>
            <p className="mt-1 text-lg font-semibold tabular text-fg-2">{formatarMoeda(saldo?.saldoPendente || 0)}</p>
          </div>
          <Link href="/motoboy/ganhos" className="group flex flex-col justify-between p-4 hover:bg-surface-2/60">
            <p className="text-xs text-fg-3">Entregas · nota</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold tabular text-fg">
              {motoboy?.totalEntregas ?? 0}
              <span className="flex items-center gap-0.5 text-sm font-medium text-fg-2"><Star className="h-3.5 w-3.5 fill-current text-chart-4" />{motoboy?.avaliacaoMedia.toFixed(1) ?? '—'}</span>
            </p>
          </Link>
        </section>

        {/* Entrega atual */}
        {pedidoAtual && (
          <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <PedidoStatusBadge status={pedidoAtual.status} />
                <span className="text-xs text-fg-3">{LABELS_TIPO_SERVICO[pedidoAtual.tipoServico as TipoServico] ?? pedidoAtual.tipoServico}</span>
              </div>
              <Link href={`/motoboy/pedido/${pedidoAtual.id}`} className="font-mono text-xs text-fg-3 hover:text-fg">{codigoPedido(pedidoAtual.id)}</Link>
            </div>

            {pedidoAtual.enderecoOrigem?.latitude && pedidoAtual.enderecoDestino?.latitude && (
              <TrackingMap
                origem={{ lat: pedidoAtual.enderecoOrigem.latitude, lng: pedidoAtual.enderecoOrigem.longitude, label: 'Coleta' }}
                destino={{ lat: pedidoAtual.enderecoDestino.latitude, lng: pedidoAtual.enderecoDestino.longitude, label: 'Entrega' }}
                motoboyLocation={null}
                className="h-56 border-b border-line md:h-72"
              />
            )}

            <div className="space-y-4 p-4">
              {enderecoBloco('coleta', pedidoAtual.enderecoOrigem)}
              {enderecoBloco('entrega', pedidoAtual.enderecoDestino)}

              <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                <div className="min-w-0">
                  <p className="text-xs text-fg-3">Cliente</p>
                  <p className="truncate text-sm font-medium text-fg">{pedidoAtual.cliente.user.nome}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`tel:${pedidoAtual.cliente.user.telefone}`} className={buttonClass('outline', 'sm')}><Phone className="h-3.5 w-3.5" /> Ligar</a>
                  <span className="text-lg font-semibold tabular text-fg">{formatarMoeda(pedidoAtual.valorTotal)}</span>
                </div>
              </div>

              {getNextStatus(pedidoAtual.status) && (
                <Button size="lg" className="w-full" onClick={() => handleAtualizarStatusPedido(getNextStatus(pedidoAtual.status)!)}>
                  {getNextStatusLabel(pedidoAtual.status)} <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Pedidos disponíveis */}
        {!pedidoAtual && motoboy?.status === 'DISPONIVEL' && (
          <section>
            <div className="mb-3 mt-6 flex items-center justify-between">
              <h2 className="text-sm font-medium text-fg-2">Pedidos disponíveis</h2>
              <span className="flex items-center gap-1.5 text-xs text-fg-3"><RefreshCw className="h-3 w-3" /> atualiza a cada 10 s</span>
            </div>
            {pedidosDisponiveis.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong bg-surface">
                <EmptyState icon={Inbox} title="Nenhum pedido no momento" description="Fique nesta tela: novos pedidos aparecem automaticamente." />
              </div>
            ) : (
              <ul className="space-y-3">
                {pedidosDisponiveis.map((pedido) => (
                  <li key={pedido.id} className="rounded-xl border border-line bg-surface p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-semibold tracking-tight tabular text-fg">{formatarMoeda(pedido.valorTotal)}</p>
                        <p className="mt-0.5 text-[13px] tabular text-fg-3">
                          {pedido.distanciaKm.toFixed(1)} km · ~{pedido.duracaoEstimada} min · {LABELS_TIPO_SERVICO[pedido.tipoServico as TipoServico] ?? pedido.tipoServico}
                        </p>
                      </div>
                      {pedido.tipoServico === 'EXPRESSA' && <Badge variant="brand">Prioridade</Badge>}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-fg-2">
                      <span className="truncate">{pedido.enderecoOrigem.bairro}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-3" />
                      <span className="truncate">{pedido.enderecoDestino.bairro}</span>
                    </div>
                    <Button className="mt-4 w-full" onClick={() => handleAceitarPedido(pedido.id)}>Aceitar entrega</Button>
                  </li>
                ))}
              </ul>
            )}
            {list.pagination.totalPages > 1 && (
              <Pagination pagination={list.pagination} onPageChange={list.setPage} loading={list.loading} error={list.error} />
            )}
          </section>
        )}

        {!pedidoAtual && motoboy?.status === 'OFFLINE' && (
          <div className="rounded-xl border border-line bg-surface">
            <EmptyState
              icon={Power}
              title="Você está offline"
              description="Fique online para começar a receber pedidos próximos."
              action={<Button onClick={handleToggleStatus} isLoading={isUpdatingStatus}>Ficar online</Button>}
            />
          </div>
        )}
      </main>
    </div>
  )
}
