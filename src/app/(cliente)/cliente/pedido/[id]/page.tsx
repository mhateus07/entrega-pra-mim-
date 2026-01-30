'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import TrackingMap from '@/components/maps/TrackingMap'
import ChatBox from '@/components/chat/ChatBox'
import { useTracking } from '@/hooks/useTracking'
import { useNotifications } from '@/hooks/useNotifications'
import { formatarMoeda, formatarDistancia, formatarTempo } from '@/lib/pricing'
import { LABELS_STATUS_PEDIDO, CORES_STATUS_PEDIDO, formatarDataHora } from '@/utils/helpers'
import { StatusPedido } from '@/types'
import toast from 'react-hot-toast'
import {
  LABELS_METODO_PAGAMENTO,
  LABELS_STATUS_PAGAMENTO,
  CORES_STATUS_PAGAMENTO,
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
  const [showTracking, setShowTracking] = useState(false)

  const { permission, requestPermission } = useNotifications()

  // Rastreamento em tempo real
  const isTrackingEnabled = pedido && ['ACEITO', 'EM_COLETA', 'EM_ENTREGA'].includes(pedido.status)
  const { data: trackingData } = useTracking({
    pedidoId,
    enabled: !!isTrackingEnabled,
    pollingInterval: 5000,
    onStatusChange: (newStatus, oldStatus) => {
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
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return

    setIsCancelling(true)
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCancelamento: 'Cancelado pelo cliente' }),
      })

      const data = await response.json()

      if (data.success) {
        setPedido({ ...pedido!, status: 'CANCELADO', canceladoEm: new Date().toISOString() })
      } else {
        setError(data.error || 'Erro ao cancelar')
      }
    } catch {
      setError('Erro ao cancelar pedido')
    } finally {
      setIsCancelling(false)
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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/cliente">
            <Button>Voltar</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!pedido) return null

  const podeCancelar = ['SOLICITADO', 'ACEITO'].includes(pedido.status)
  const podeAvaliar = pedido.status === 'ENTREGUE' && !pedido.avaliacao && pedido.motoboy

  const statusTimeline = [
    { status: 'SOLICITADO', label: 'Solicitado', time: pedido.createdAt },
    { status: 'ACEITO', label: 'Aceito', time: pedido.aceitoEm },
    { status: 'EM_COLETA', label: 'Em Coleta', time: pedido.coletadoEm },
    { status: 'EM_ENTREGA', label: 'Em Entrega', time: null },
    { status: 'ENTREGUE', label: 'Entregue', time: pedido.entregueEm },
  ]

  const currentStatusIndex = statusTimeline.findIndex(s => s.status === pedido.status)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/cliente" className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pedido #{pedido.id.slice(0, 8)}</h1>
              <p className="text-sm text-gray-500">{formatarDataHora(pedido.createdAt)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Status */}
        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${CORES_STATUS_PEDIDO[pedido.status]}`}>
                  {LABELS_STATUS_PEDIDO[pedido.status]}
                </span>
                <Badge variant="info" size="sm" className="ml-2">
                  {pedido.tipoServico}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatarMoeda(pedido.valorTotal)}</p>
            </div>

            {/* Timeline */}
            {pedido.status !== 'CANCELADO' && (
              <div className="flex justify-between mb-4">
                {statusTimeline.map((item, index) => (
                  <div key={item.status} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index <= currentStatusIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {index < currentStatusIndex ? '✓' : index + 1}
                    </div>
                    <p className={`text-xs mt-1 text-center ${index <= currentStatusIndex ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {pedido.status === 'CANCELADO' && (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-700 font-medium">Pedido cancelado</p>
                {pedido.motivoCancelamento && (
                  <p className="text-red-600 text-sm mt-1">{pedido.motivoCancelamento}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notificações */}
        {permission !== 'granted' && isTrackingEnabled && (
          <Card variant="bordered" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Ativar notificações</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Receba alertas sobre o status do pedido</p>
                  </div>
                </div>
                <Button size="sm" onClick={requestPermission}>
                  Ativar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rastreamento em Tempo Real */}
        {isTrackingEnabled && (
          <Card variant="bordered">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Rastreamento ao Vivo
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTracking(!showTracking)}
              >
                {showTracking ? 'Ocultar Mapa' : 'Ver no Mapa'}
              </Button>
            </CardHeader>
            <CardContent>
              {trackingData?.etaMinutos && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tempo estimado</p>
                  <p className="text-2xl font-bold text-blue-600">{trackingData.etaMinutos} min</p>
                </div>
              )}

              {showTracking && (
                <div className="h-[300px] mb-4">
                  <TrackingMap
                    origem={pedido.enderecoOrigem.latitude && pedido.enderecoOrigem.longitude ? {
                      lat: pedido.enderecoOrigem.latitude,
                      lng: pedido.enderecoOrigem.longitude,
                    } : null}
                    destino={pedido.enderecoDestino.latitude && pedido.enderecoDestino.longitude ? {
                      lat: pedido.enderecoDestino.latitude,
                      lng: pedido.enderecoDestino.longitude,
                    } : null}
                    motoboyLocation={trackingData?.motoboy?.latitudeAtual && trackingData?.motoboy?.longitudeAtual ? {
                      lat: trackingData.motoboy.latitudeAtual,
                      lng: trackingData.motoboy.longitudeAtual,
                    } : null}
                    className="h-full"
                  />
                </div>
              )}

              {trackingData?.motoboy && (
                <p className="text-sm text-gray-500">
                  Última atualização: {trackingData.motoboy.ultimaAtividade
                    ? formatarDataHora(trackingData.motoboy.ultimaAtividade)
                    : 'Aguardando...'}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Motoboy */}
        {pedido.motoboy && (
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Motoboy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{pedido.motoboy.user.nome}</p>
                  <p className="text-sm text-gray-600">{pedido.motoboy.user.telefone}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-medium">{pedido.motoboy.avaliacaoMedia.toFixed(1)}</span>
                    </div>
                  </div>
                  <a
                    href={`tel:${pedido.motoboy.user.telefone}`}
                    className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Endereços */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Endereços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Coleta</p>
                <p className="text-gray-900">{pedido.enderecoOrigem.logradouro}, {pedido.enderecoOrigem.numero}</p>
                {pedido.enderecoOrigem.complemento && <p className="text-gray-600 text-sm">{pedido.enderecoOrigem.complemento}</p>}
                <p className="text-gray-600 text-sm">{pedido.enderecoOrigem.bairro}, {pedido.enderecoOrigem.cidade} - {pedido.enderecoOrigem.estado}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Entrega</p>
                <p className="text-gray-900">{pedido.enderecoDestino.logradouro}, {pedido.enderecoDestino.numero}</p>
                {pedido.enderecoDestino.complemento && <p className="text-gray-600 text-sm">{pedido.enderecoDestino.complemento}</p>}
                <p className="text-gray-600 text-sm">{pedido.enderecoDestino.bairro}, {pedido.enderecoDestino.cidade} - {pedido.enderecoDestino.estado}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Distância</p>
                <p className="font-medium text-gray-900">{formatarDistancia(pedido.distanciaKm)}</p>
              </div>
              <div>
                <p className="text-gray-500">Tempo Estimado</p>
                <p className="font-medium text-gray-900">{formatarTempo(pedido.duracaoEstimada)}</p>
              </div>
              {pedido.descricaoItem && (
                <div className="col-span-2">
                  <p className="text-gray-500">Item</p>
                  <p className="font-medium text-gray-900">{pedido.descricaoItem}</p>
                </div>
              )}
              {pedido.observacoes && (
                <div className="col-span-2">
                  <p className="text-gray-500">Observações</p>
                  <p className="font-medium text-gray-900">{pedido.observacoes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pagamento */}
        {pedido.pagamento && (
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pagamento</span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${CORES_STATUS_PAGAMENTO[pedido.pagamento.status]}`}>
                  {LABELS_STATUS_PAGAMENTO[pedido.pagamento.status]}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Método</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    {pedido.pagamento.metodo === 'PIX' && '📱'}
                    {(pedido.pagamento.metodo === 'CARTAO_CREDITO' || pedido.pagamento.metodo === 'CARTAO_DEBITO') && '💳'}
                    {pedido.pagamento.metodo === 'DINHEIRO' && '💵'}
                    {LABELS_METODO_PAGAMENTO[pedido.pagamento.metodo]}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Valor</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatarValor(pedido.pagamento.valor)}
                  </p>
                </div>
                {pedido.pagamento.cartaoUltimos4 && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Cartão</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      **** {pedido.pagamento.cartaoUltimos4} ({pedido.pagamento.cartaoBandeira})
                    </p>
                  </div>
                )}
                {pedido.pagamento.aprovadoEm && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Aprovado em</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatarDataHora(pedido.pagamento.aprovadoEm)}
                    </p>
                  </div>
                )}
                {pedido.pagamento.metodo === 'DINHEIRO' && pedido.pagamento.status === 'PENDENTE' && (
                  <div className="col-span-2">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      O pagamento será confirmado pelo motoboy no momento da entrega.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Avaliação existente */}
        {pedido.avaliacao && (
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Sua Avaliação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={`text-2xl ${star <= pedido.avaliacao!.nota ? 'text-yellow-500' : 'text-gray-300'}`}>
                    ★
                  </span>
                ))}
              </div>
              {pedido.avaliacao.comentario && (
                <p className="text-gray-600">{pedido.avaliacao.comentario}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Formulário de avaliação */}
        {showRatingForm && (
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Avaliar Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Como foi a entrega?</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-3xl transition-colors ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comentário (opcional)
                </label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900"
                  rows={3}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Conte como foi sua experiência..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRatingForm(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAvaliar} isLoading={isRating}>
                  Enviar Avaliação
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comprovante de Entrega */}
        {pedido.fotoComprovante && (
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Comprovante de Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={pedido.fotoComprovante}
                  alt="Comprovante de entrega"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">
                Foto registrada pelo motoboy na entrega
              </p>
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <div className="flex justify-between">
          <Link href="/cliente">
            <Button variant="outline">Voltar</Button>
          </Link>
          <div className="flex gap-3">
            {podeCancelar && (
              <Button variant="danger" onClick={handleCancelar} isLoading={isCancelling}>
                Cancelar Pedido
              </Button>
            )}
            {podeAvaliar && !showRatingForm && (
              <Button onClick={() => setShowRatingForm(true)}>
                Avaliar Entrega
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Chat com Motoboy */}
      {pedido.motoboy && ['ACEITO', 'EM_COLETA', 'EM_ENTREGA'].includes(pedido.status) && (
        <ChatBox
          pedidoId={pedidoId}
          userType="CLIENTE"
          enabled={true}
        />
      )}
    </div>
  )
}
