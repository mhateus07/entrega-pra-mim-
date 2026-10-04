'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Bell, Phone, Star } from 'lucide-react'
import Button, { buttonClass } from '@/components/ui/Button'
import Header from '@/components/ui/Header'
import Textarea from '@/components/ui/Textarea'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert, DataRow, EmptyState, FullPageLoader } from '@/components/ui/Feedback'
import { PedidoStatusBadge, PagamentoStatusBadge } from '@/components/ui/StatusBadge'
import { RotaEnderecos, LinhaDoTempo, Estrelas } from '@/components/pedido/PedidoParts'
import { cn } from '@/utils/cn'
import TrackingMap from '@/components/maps/TrackingMap'
import ChatBox from '@/components/chat/ChatBox'
import { useTracking } from '@/hooks/useTracking'
import { useNotifications } from '@/hooks/useNotifications'
import { formatarMoeda, formatarDistancia, formatarTempo } from '@/lib/pricing'
import { LABELS_STATUS_PEDIDO, LABELS_TIPO_SERVICO, codigoPedido, formatarDataHora } from '@/utils/helpers'
import type { StatusPedido, TipoServico } from '@prisma/client'
import toast from 'react-hot-toast'
import {
  LABELS_METODO_PAGAMENTO,
  formatarValor,
  type MetodoPagamento,
  type StatusPagamento,
} from '@/lib/pagamentos'

interface Pagamento {
  id: string
  metodo: MetodoPagamento
  status: StatusPagamento
  valor: number
  cartaoUltimos4: string | null
  cartaoBandeira: string | null
  aprovadoEm: string | null
  createdAt: string
}

interface Pedido {
  id: string
  status: StatusPedido
  tipoServico: string
  valorTotal: number
  distanciaKm: number
  duracaoEstimada: number
  descricaoItem: string | null
  observacoes: string | null
  createdAt: string
  aceitoEm: string | null
  coletadoEm: string | null
  entregueEm: string | null
  canceladoEm: string | null
  motivoCancelamento: string | null
  cliente: {
    user: {
      nome: string
      telefone: string
    }
  }
  motoboy: {
    id: string
    avaliacaoMedia: number
    user: {
      nome: string
      telefone: string
    }
  } | null
  enderecoOrigem: {
    logradouro: string
    numero: string
    complemento: string | null
    bairro: string
    cidade: string
    estado: string
    latitude?: number | null
    longitude?: number | null
  }
  enderecoDestino: {
    logradouro: string
    numero: string
    complemento: string | null
    bairro: string
    cidade: string
    estado: string
    latitude?: number | null
    longitude?: number | null
  }
  avaliacao: {
    nota: number
    comentario: string | null
  } | null
  fotoComprovante: string | null
  pagamento: Pagamento | null
}

export default function PedidoDetalhePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const pedidoId = params.id as string

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRating, setIsRating] = useState(false)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')
  const [showTracking, setShowTracking] = useState(true)
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false)

  const { permission, requestPermission } = useNotifications()

  // Rastreamento em tempo real
  const isTrackingEnabled = pedido && ['ACEITO', 'EM_COLETA', 'EM_ENTREGA'].includes(pedido.status)
  const { data: trackingData } = useTracking({
    pedidoId,
    enabled: !!isTrackingEnabled,
    pollingInterval: 5000,
    onStatusChange: (newStatus) => {
      // Atualizar pedido quando status mudar
      setPedido(prev => prev ? { ...prev, status: newStatus as StatusPedido } : null)
      toast.success(`Status atualizado: ${LABELS_STATUS_PEDIDO[newStatus as StatusPedido]}`)
    },
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const response = await fetch(`/api/pedidos/${pedidoId}`)
        const data = await response.json()

        if (data.success) {
          setPedido(data.data)
        } else {
          setError('Pedido não encontrado')
        }
      } catch {
        setError('Erro ao carregar pedido')
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated' && pedidoId) {
      fetchPedido()
    }
  }, [status, pedidoId])

  const handleCancelar = async () => {
    setIsCancelling(true)
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCancelamento: 'Cancelado pelo cliente' }),
      })

      const data = await response.json()

      if (data.success) {
        setPedido({ ...pedido!, status: 'CANCELADO', canceladoEm: new Date().toISOString(), motivoCancelamento: 'Cancelado pelo cliente' })
      } else {
        setError(data.error || 'Erro ao cancelar')
      }
    } catch {
      setError('Erro ao cancelar pedido')
    } finally {
      setIsCancelling(false)
      setConfirmarCancelamento(false)
    }
  }

  const handleAvaliar = async () => {
    if (!pedido?.motoboy) return

    setIsRating(true)
    try {
      const response = await fetch('/api/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId,
          nota: rating,
          comentario: comentario || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPedido({ ...pedido, avaliacao: { nota: rating, comentario } })
        setShowRatingForm(false)
      } else {
        setError(data.error || 'Erro ao avaliar')
      }
    } catch {
      setError('Erro ao enviar avaliação')
    } finally {
      setIsRating(false)
    }
  }

  if (status === 'loading' || isLoading) return <FullPageLoader label="Carregando pedido…" />

  if (error && !pedido) {
    return (
      <div className="min-h-screen bg-page">
        <EmptyState
          className="min-h-screen"
          icon={AlertTriangle}
          title={error}
          action={<Link href="/cliente" className={buttonClass('outline')}>Voltar às entregas</Link>}
        />
      </div>
    )
  }

  if (!pedido) return null

  const podeCancelar = ['SOLICITADO', 'ACEITO'].includes(pedido.status)
  const podeAvaliar = pedido.status === 'ENTREGUE' && !pedido.avaliacao && pedido.motoboy

  return (
    <div className="min-h-screen bg-page">
      <Header userName={session?.user?.name} userRole="CLIENTE" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/cliente" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Minhas entregas
        </Link>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-[22px] font-semibold tracking-tight text-fg">{codigoPedido(pedido.id)}</h1>
              <PedidoStatusBadge status={pedido.status} />
            </div>
            <p className="mt-1 text-sm text-fg-3">{LABELS_TIPO_SERVICO[pedido.tipoServico as TipoServico] ?? pedido.tipoServico} · criado em {formatarDataHora(pedido.createdAt)}</p>
          </div>
          <p className="text-[26px] font-semibold tracking-tight tabular text-fg">{formatarMoeda(pedido.valorTotal)}</p>
        </div>

        {error && <Alert variant="danger" icon={AlertTriangle} className="mb-4">{error}</Alert>}

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {pedido.status === 'CANCELADO' && (
              <Alert variant="danger" title="Pedido cancelado">{pedido.motivoCancelamento || 'Este pedido foi cancelado.'}</Alert>
            )}

            {isTrackingEnabled && (
              <Card padding={false} className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    <CardTitle>Acompanhamento ao vivo</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    {trackingData?.etaMinutos ? (
                      <span className="text-[13px] text-fg-3">Chega em <span className="font-semibold tabular text-fg">{trackingData.etaMinutos} min</span></span>
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={() => setShowTracking(!showTracking)}>
                      {showTracking ? 'Ocultar mapa' : 'Ver mapa'}
                    </Button>
                  </div>
                </div>
                {showTracking && (
                  <div className="h-[320px] border-t border-line">
                    <TrackingMap
                      origem={pedido.enderecoOrigem.latitude && pedido.enderecoOrigem.longitude ? { lat: pedido.enderecoOrigem.latitude, lng: pedido.enderecoOrigem.longitude } : null}
                      destino={pedido.enderecoDestino.latitude && pedido.enderecoDestino.longitude ? { lat: pedido.enderecoDestino.latitude, lng: pedido.enderecoDestino.longitude } : null}
                      motoboyLocation={trackingData?.motoboy?.latitudeAtual && trackingData?.motoboy?.longitudeAtual ? { lat: trackingData.motoboy.latitudeAtual, lng: trackingData.motoboy.longitudeAtual } : null}
                      className="h-full"
                    />
                  </div>
                )}
                {trackingData?.motoboy && (
                  <p className="border-t border-line px-5 py-2.5 text-xs text-fg-3">
                    Última posição: {trackingData.motoboy.ultimaAtividade ? formatarDataHora(trackingData.motoboy.ultimaAtividade) : 'aguardando…'}
                  </p>
                )}
              </Card>
            )}

            {permission !== 'granted' && isTrackingEnabled && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-fg-3" aria-hidden="true" />
                  <p className="text-sm text-fg-2">Receba um aviso quando o status do pedido mudar.</p>
                </div>
                <Button size="sm" variant="outline" onClick={requestPermission}>Ativar avisos</Button>
              </div>
            )}

            <Card>
              <CardHeader><CardTitle>Trajeto</CardTitle></CardHeader>
              <RotaEnderecos origem={pedido.enderecoOrigem} destino={pedido.enderecoDestino} />
              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
                <div className="bg-surface-2/60 px-3 py-2.5">
                  <p className="text-xs text-fg-3">Distância</p>
                  <p className="text-sm font-medium tabular text-fg">{formatarDistancia(pedido.distanciaKm)}</p>
                </div>
                <div className="bg-surface-2/60 px-3 py-2.5">
                  <p className="text-xs text-fg-3">Tempo estimado</p>
                  <p className="text-sm font-medium tabular text-fg">{formatarTempo(pedido.duracaoEstimada)}</p>
                </div>
              </div>
              {(pedido.descricaoItem || pedido.observacoes) && (
                <div className="mt-4 divide-y divide-line border-t border-line">
                  {pedido.descricaoItem && <DataRow label="Item">{pedido.descricaoItem}</DataRow>}
                  {pedido.observacoes && <DataRow label="Observações">{pedido.observacoes}</DataRow>}
                </div>
              )}
            </Card>

            {pedido.fotoComprovante && (
              <Card>
                <CardHeader>
                  <CardTitle>Comprovante de entrega</CardTitle>
                  <CardDescription>Foto registrada pelo entregador no destino</CardDescription>
                </CardHeader>
                <div className="relative aspect-video overflow-hidden rounded-lg border border-line bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- rota autenticada: o otimizador do next/image não envia o cookie de sessão */}
                  <img src={pedido.fotoComprovante} alt="Comprovante de entrega" className="h-full w-full object-contain" />
                </div>
              </Card>
            )}

            {showRatingForm && (
              <Card>
                <CardHeader><CardTitle>Avaliar entrega</CardTitle></CardHeader>
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-[13px] font-medium text-fg-2">Como foi a entrega?</p>
                    <div className="flex gap-1" role="radiogroup" aria-label="Nota">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} estrelas`} onClick={() => setRating(n)} className="rounded-md p-1 hover:bg-surface-2">
                          <Star className={cn('h-7 w-7', n <= rating ? 'fill-current text-chart-4' : 'text-line-strong')} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea label="Comentário (opcional)" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Conte como foi sua experiência" />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowRatingForm(false)}>Cancelar</Button>
                    <Button onClick={handleAvaliar} isLoading={isRating}>Enviar avaliação</Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {pedido.status !== 'CANCELADO' && (
              <Card>
                <CardHeader><CardTitle>Andamento</CardTitle></CardHeader>
                <LinhaDoTempo pedido={pedido} />
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Entregador</CardTitle></CardHeader>
              {pedido.motoboy ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-fg">{pedido.motoboy.user.nome}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[13px] text-fg-3">
                      <Star className="h-3.5 w-3.5 fill-current text-chart-4" aria-hidden="true" />
                      {pedido.motoboy.avaliacaoMedia.toFixed(1)}
                    </p>
                  </div>
                  <a href={`tel:${pedido.motoboy.user.telefone}`} className={buttonClass('outline', 'sm')} aria-label={`Ligar para ${pedido.motoboy.user.nome}`}>
                    <Phone className="h-3.5 w-3.5" /> Ligar
                  </a>
                </div>
              ) : (
                <p className="text-sm text-fg-3">{pedido.status === 'CANCELADO' ? 'Nenhum entregador atribuído.' : 'Procurando um entregador disponível…'}</p>
              )}
            </Card>

            {pedido.pagamento && (
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <CardTitle>Pagamento</CardTitle>
                  <PagamentoStatusBadge status={pedido.pagamento.status} />
                </div>
                <div className="divide-y divide-line">
                  <DataRow label="Forma">{LABELS_METODO_PAGAMENTO[pedido.pagamento.metodo]}</DataRow>
                  <DataRow label="Valor"><span className="tabular">{formatarValor(pedido.pagamento.valor)}</span></DataRow>
                  {pedido.pagamento.cartaoUltimos4 && (
                    <DataRow label="Cartão"><span className="tabular">•••• {pedido.pagamento.cartaoUltimos4}</span> {pedido.pagamento.cartaoBandeira}</DataRow>
                  )}
                  {pedido.pagamento.aprovadoEm && <DataRow label="Aprovado em"><span className="tabular">{formatarDataHora(pedido.pagamento.aprovadoEm)}</span></DataRow>}
                </div>
                {pedido.pagamento.metodo === 'DINHEIRO' && pedido.pagamento.status === 'PENDENTE' && (
                  <p className="mt-3 text-[13px] text-fg-3">O pagamento será confirmado pelo entregador no momento da entrega.</p>
                )}
              </Card>
            )}

            {pedido.avaliacao && (
              <Card>
                <CardHeader><CardTitle>Sua avaliação</CardTitle></CardHeader>
                <Estrelas nota={pedido.avaliacao.nota} />
                {pedido.avaliacao.comentario && <p className="mt-2 text-sm text-fg-2">“{pedido.avaliacao.comentario}”</p>}
              </Card>
            )}

            {podeAvaliar && !showRatingForm && (
              <Button className="w-full" onClick={() => setShowRatingForm(true)}>
                <Star className="h-4 w-4" /> Avaliar entrega
              </Button>
            )}

            {podeCancelar && (
              confirmarCancelamento ? (
                <Card>
                  <p className="text-sm text-fg-2">Deseja mesmo cancelar este pedido?</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setConfirmarCancelamento(false)} disabled={isCancelling}>Voltar</Button>
                    <Button variant="danger" className="flex-1" onClick={handleCancelar} isLoading={isCancelling}>Cancelar pedido</Button>
                  </div>
                </Card>
              ) : (
                <Button variant="ghost" className="w-full text-danger hover:text-danger" onClick={() => setConfirmarCancelamento(true)}>
                  Cancelar pedido
                </Button>
              )
            )}
          </div>
        </div>
      </main>

      {pedido.motoboy && ['ACEITO', 'EM_COLETA', 'EM_ENTREGA'].includes(pedido.status) && (
        <ChatBox pedidoId={pedidoId} userType="CLIENTE" enabled={true} />
      )}
    </div>
  )
}
