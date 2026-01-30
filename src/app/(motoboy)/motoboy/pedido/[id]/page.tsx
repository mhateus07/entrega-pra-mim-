'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ChatBox from '@/components/chat/ChatBox'
import PhotoCapture from '@/components/camera/PhotoCapture'
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
  valorMotoboy: number
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
  enderecoOrigem: {
    logradouro: string
    numero: string
    complemento: string | null
    bairro: string
    cidade: string
    estado: string
  }
  enderecoDestino: {
    logradouro: string
    numero: string
    complemento: string | null
    bairro: string
    cidade: string
    estado: string
  }
  avaliacao: {
    nota: number
    comentario: string | null
  } | null
  fotoComprovante: string | null
  pagamento: Pagamento | null
}

export default function PedidoMotoboyDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const pedidoId = params.id as string

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const [error, setError] = useState('')

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

  const handleAtualizarStatus = async (novoStatus: StatusPedido) => {
    if (!pedido) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })

      const data = await response.json()

      if (data.success) {
        setPedido(data.data)
      } else {
        setError(data.error || 'Erro ao atualizar')
      }
    } catch {
      setError('Erro ao atualizar pedido')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleConfirmarPagamentoDinheiro = async () => {
    if (!pedido?.pagamento) return

    setIsConfirmingPayment(true)
    try {
      const response = await fetch(`/api/pagamentos/${pedido.pagamento.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'confirmar_dinheiro' }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Pagamento em dinheiro confirmado!')
        // Atualizar o estado do pagamento
        setPedido({
          ...pedido,
          pagamento: {
            ...pedido.pagamento,
            status: 'APROVADO',
          },
        })
      } else {
        toast.error(data.error || 'Erro ao confirmar pagamento')
      }
    } catch {
      toast.error('Erro ao confirmar pagamento')
    } finally {
      setIsConfirmingPayment(false)
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
          <Link href="/motoboy">
            <Button>Voltar</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!pedido) return null

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
      SOLICITADO: 'Aceitar Pedido',
      ACEITO: 'Iniciar Coleta',
      EM_COLETA: 'Iniciar Entrega',
      EM_ENTREGA: 'Confirmar Entrega',
      ENTREGUE: null,
      CANCELADO: null,
    }
    return labels[currentStatus]
  }

  const statusTimeline = [
    { status: 'ACEITO', label: 'Aceito', time: pedido.aceitoEm },
    { status: 'EM_COLETA', label: 'Em Coleta', time: pedido.coletadoEm },
    { status: 'EM_ENTREGA', label: 'Em Entrega', time: null },
    { status: 'ENTREGUE', label: 'Entregue', time: pedido.entregueEm },
  ]

  const currentStatusIndex = statusTimeline.findIndex(s => s.status === pedido.status)
  const pedidoEmAndamento = !['ENTREGUE', 'CANCELADO', 'SOLICITADO'].includes(pedido.status)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/motoboy" className="text-gray-500 hover:text-gray-700">
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

        {/* Status e Valor */}
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
              <p className="text-2xl font-bold text-green-600">{formatarMoeda(pedido.valorTotal)}</p>
            </div>

            {/* Timeline */}
            {pedido.status !== 'CANCELADO' && pedido.status !== 'SOLICITADO' && (
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

            {/* Foto do Comprovante - mostrar quando EM_ENTREGA */}
            {pedido.status === 'EM_ENTREGA' && !pedido.fotoComprovante && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  Tire uma foto como comprovante antes de finalizar a entrega
                </p>
                <PhotoCapture
                  pedidoId={pedido.id}
                  onPhotoSent={(photoUrl) => {
                    setPedido({ ...pedido, fotoComprovante: photoUrl })
                    toast.success('Foto do comprovante salva!')
                  }}
                />
              </div>
            )}

            {/* Foto já enviada */}
            {pedido.fotoComprovante && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Comprovante enviado</span>
                </div>
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img
                    src={pedido.fotoComprovante}
                    alt="Comprovante"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Botão de ação */}
            {pedidoEmAndamento && getNextStatus(pedido.status) && (
              <div className="mt-6">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleAtualizarStatus(getNextStatus(pedido.status)!)}
                  isLoading={isUpdating}
                  disabled={pedido.status === 'EM_ENTREGA' && !pedido.fotoComprovante}
                >
                  {getNextStatusLabel(pedido.status)}
                </Button>
                {pedido.status === 'EM_ENTREGA' && !pedido.fotoComprovante && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Envie a foto do comprovante para confirmar a entrega
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cliente */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{pedido.cliente.user.nome}</p>
                <p className="text-sm text-gray-600">{pedido.cliente.user.telefone}</p>
              </div>
              <a
                href={`tel:${pedido.cliente.user.telefone}`}
                className="p-3 bg-green-100 rounded-full text-green-600 hover:bg-green-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Endereços */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Endereços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase font-medium">Coleta</p>
                <p className="text-gray-900 font-medium">{pedido.enderecoOrigem.logradouro}, {pedido.enderecoOrigem.numero}</p>
                {pedido.enderecoOrigem.complemento && <p className="text-gray-600 text-sm">{pedido.enderecoOrigem.complemento}</p>}
                <p className="text-gray-600 text-sm">{pedido.enderecoOrigem.bairro}, {pedido.enderecoOrigem.cidade}</p>
              </div>
            </div>
            <div className="border-l-2 border-dashed border-gray-300 ml-5 h-4"></div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase font-medium">Entrega</p>
                <p className="text-gray-900 font-medium">{pedido.enderecoDestino.logradouro}, {pedido.enderecoDestino.numero}</p>
                {pedido.enderecoDestino.complemento && <p className="text-gray-600 text-sm">{pedido.enderecoDestino.complemento}</p>}
                <p className="text-gray-600 text-sm">{pedido.enderecoDestino.bairro}, {pedido.enderecoDestino.cidade}</p>
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
                  <p className="text-gray-500 dark:text-gray-400">Seu Ganho</p>
                  <p className="font-medium text-green-600 text-lg">
                    {formatarValor(pedido.pagamento.valorMotoboy)}
                  </p>
                </div>
              </div>

              {/* Confirmação de dinheiro */}
              {pedido.pagamento.metodo === 'DINHEIRO' && pedido.pagamento.status === 'PENDENTE' && pedidoEmAndamento && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💵</span>
                    <div className="flex-1">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        Pagamento em Dinheiro
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                        O cliente pagará {formatarValor(pedido.pagamento.valor)} em dinheiro na entrega.
                        Confirme o recebimento após receber o valor.
                      </p>
                      <Button
                        onClick={handleConfirmarPagamentoDinheiro}
                        isLoading={isConfirmingPayment}
                        size="sm"
                      >
                        Confirmar Recebimento
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagamento confirmado */}
              {pedido.pagamento.status === 'APROVADO' && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Pagamento confirmado</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Avaliação recebida */}
        {pedido.avaliacao && (
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Avaliação do Cliente</CardTitle>
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

        {/* Voltar */}
        <div className="flex justify-between">
          <Link href="/motoboy">
            <Button variant="outline">Voltar</Button>
          </Link>
          <Link href="/motoboy/historico">
            <Button variant="outline">Ver Histórico</Button>
          </Link>
        </div>
      </main>

      {/* Chat com Cliente */}
      {pedidoEmAndamento && (
        <ChatBox
          pedidoId={pedidoId}
          userType="MOTOBOY"
          enabled={true}
        />
      )}
    </div>
  )
}
