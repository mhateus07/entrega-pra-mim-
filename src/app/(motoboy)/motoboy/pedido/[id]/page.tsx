'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, Phone } from 'lucide-react'
import Button, { buttonClass } from '@/components/ui/Button'
import Header from '@/components/ui/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, DataRow, EmptyState, FullPageLoader } from '@/components/ui/Feedback'
import { PedidoStatusBadge, PagamentoStatusBadge } from '@/components/ui/StatusBadge'
import { RotaEnderecos, LinhaDoTempo, Estrelas } from '@/components/pedido/PedidoParts'
import ChatBox from '@/components/chat/ChatBox'
import PhotoCapture from '@/components/camera/PhotoCapture'
import { formatarMoeda, formatarDistancia, formatarTempo } from '@/lib/pricing'
import { LABELS_TIPO_SERVICO, codigoPedido, formatarDataHora } from '@/utils/helpers'
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
        toast.success('Recebimento em dinheiro confirmado')
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

  if (status === 'loading' || isLoading) return <FullPageLoader label="Carregando pedido…" />

  if (error && !pedido) {
    return (
      <div className="min-h-screen bg-page">
        <EmptyState
          className="min-h-screen"
          icon={AlertTriangle}
          title={error}
          action={<Link href="/motoboy" className={buttonClass('outline')}>Voltar ao início</Link>}
        />
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
      SOLICITADO: 'Aceitar pedido',
      ACEITO: 'Cheguei na coleta',
      EM_COLETA: 'Item coletado, iniciar entrega',
      EM_ENTREGA: 'Confirmar entrega',
      ENTREGUE: null,
      CANCELADO: null,
    }
    return labels[currentStatus]
  }

  const pedidoEmAndamento = !['ENTREGUE', 'CANCELADO', 'SOLICITADO'].includes(pedido.status)

  return (
    <div className="min-h-screen bg-page">
      <Header userName={session?.user?.name} userRole="MOTOBOY" />

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <Link href="/motoboy" className="inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Início
        </Link>

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-semibold tracking-tight text-fg">{codigoPedido(pedido.id)}</h1>
              <PedidoStatusBadge status={pedido.status} />
            </div>
            <p className="mt-1 text-[13px] text-fg-3">{LABELS_TIPO_SERVICO[pedido.tipoServico as TipoServico] ?? pedido.tipoServico} · {formatarDataHora(pedido.createdAt)}</p>
          </div>
          <p className="text-2xl font-semibold tracking-tight tabular text-fg">{formatarMoeda(pedido.valorTotal)}</p>
        </div>

        {error && <Alert variant="danger" icon={AlertTriangle}>{error}</Alert>}
        {pedido.status === 'CANCELADO' && <Alert variant="danger" title="Pedido cancelado">{pedido.motivoCancelamento || 'Este pedido foi cancelado.'}</Alert>}

        {/* Próxima ação */}
        {pedidoEmAndamento && (
          <Card className="space-y-4">
            {pedido.status === 'EM_ENTREGA' && !pedido.fotoComprovante && (
              <div>
                <p className="mb-3 text-sm text-fg-2">Antes de confirmar, registre uma foto da entrega como comprovante.</p>
                <PhotoCapture
                  pedidoId={pedido.id}
                  onPhotoSent={(photoUrl) => {
                    setPedido({ ...pedido, fotoComprovante: photoUrl })
                    toast.success('Comprovante salvo')
                  }}
                />
              </div>
            )}
            {getNextStatus(pedido.status) && (
              <Button
                className="w-full"
                size="lg"
                variant={pedido.status === 'EM_ENTREGA' && !pedido.fotoComprovante ? 'outline' : 'primary'}
                onClick={() => handleAtualizarStatus(getNextStatus(pedido.status)!)}
                isLoading={isUpdating}
                disabled={pedido.status === 'EM_ENTREGA' && !pedido.fotoComprovante}
              >
                {getNextStatusLabel(pedido.status)}
              </Button>
            )}
          </Card>
        )}

        {pedido.fotoComprovante && (
          <Card>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Comprovante enviado
            </div>
            <div className="aspect-video overflow-hidden rounded-lg border border-line bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- rota autenticada: o otimizador do next/image não envia o cookie de sessão */}
              <img src={pedido.fotoComprovante} alt="Comprovante de entrega" className="h-full w-full object-contain" />
            </div>
          </Card>
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

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-fg-3">Cliente</p>
              <p className="text-sm font-medium text-fg">{pedido.cliente.user.nome}</p>
            </div>
            <a href={`tel:${pedido.cliente.user.telefone}`} className={buttonClass('outline', 'sm')}><Phone className="h-3.5 w-3.5" /> Ligar</a>
          </div>
        </Card>

        {pedido.pagamento && (
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle>Pagamento</CardTitle>
              <PagamentoStatusBadge status={pedido.pagamento.status} />
            </div>
            <div className="divide-y divide-line">
              <DataRow label="Forma">{LABELS_METODO_PAGAMENTO[pedido.pagamento.metodo]}</DataRow>
              <DataRow label="Seu ganho"><span className="font-semibold tabular">{formatarValor(pedido.pagamento.valorMotoboy)}</span></DataRow>
            </div>
            {pedido.pagamento.metodo === 'DINHEIRO' && pedido.pagamento.status === 'PENDENTE' && ['EM_ENTREGA', 'ENTREGUE'].includes(pedido.status) && (
              <div className="mt-4 rounded-lg border border-warning/25 bg-warning-soft p-4">
                <p className="text-sm font-medium text-warning">Pagamento em dinheiro</p>
                <p className="mt-1 text-[13px] text-fg-2">
                  O cliente pagará {formatarValor(pedido.pagamento.valor)} na entrega. Confirme somente após receber o valor.
                </p>
                <Button onClick={handleConfirmarPagamentoDinheiro} isLoading={isConfirmingPayment} size="sm" className="mt-3">
                  Confirmar recebimento
                </Button>
              </div>
            )}
          </Card>
        )}

        {pedido.status !== 'CANCELADO' && pedido.status !== 'SOLICITADO' && (
          <Card>
            <CardHeader><CardTitle>Andamento</CardTitle></CardHeader>
            <LinhaDoTempo pedido={pedido} />
          </Card>
        )}

        {pedido.avaliacao && (
          <Card>
            <CardHeader><CardTitle>Avaliação do cliente</CardTitle></CardHeader>
            <Estrelas nota={pedido.avaliacao.nota} />
            {pedido.avaliacao.comentario && <p className="mt-2 text-sm text-fg-2">“{pedido.avaliacao.comentario}”</p>}
          </Card>
        )}
      </main>

      {pedidoEmAndamento && <ChatBox pedidoId={pedidoId} userType="MOTOBOY" enabled={true} />}
    </div>
  )
}
