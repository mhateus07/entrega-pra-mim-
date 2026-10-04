'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Phone, Mail, Star, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import Pagination from '@/components/ui/Pagination'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button, { buttonClass } from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { PageLoader, Alert, DataRow, EmptyState } from '@/components/ui/Feedback'
import { PedidoStatusBadge } from '@/components/ui/StatusBadge'
import { RotaEnderecos, LinhaDoTempo, Estrelas } from '@/components/pedido/PedidoParts'
import { formatarMoeda, formatarDistancia, formatarTempo } from '@/lib/pricing'
import { LABELS_TIPO_SERVICO, codigoPedido, formatarDataHora } from '@/utils/helpers'
import type { StatusPedido, TipoServico } from '@prisma/client'

interface Endereco {
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
}

interface Pedido {
  id: string
  status: StatusPedido
  tipoServico: TipoServico
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
  cliente: { id: string; user: { nome: string; email: string; telefone: string } }
  motoboy: { id: string; avaliacaoMedia: number; user: { nome: string; telefone: string } } | null
  enderecoOrigem: Endereco
  enderecoDestino: Endereco
  avaliacao: { nota: number; comentario: string | null } | null
}

interface Motoboy {
  id: string
  status: string
  user: { nome: string }
}

export default function PedidoAdminDetailPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const pedidoId = params.id as string

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const list = usePaginatedList<Motoboy>(status === 'authenticated' ? '/api/motoboys?status=DISPONIVEL' : null)
  const motoboys = list.data
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedMotoboy, setSelectedMotoboy] = useState('')
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pedidoRes = await fetch(`/api/pedidos/${pedidoId}`)
        const pedidoData = await pedidoRes.json()
        if (pedidoData.success) setPedido(pedidoData.data)
        else setError('Pedido não encontrado')
      } catch {
        setError('Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }
    if (status === 'authenticated' && pedidoId) fetchData()
  }, [status, pedidoId])

  const handleAtribuirMotoboy = async () => {
    if (!selectedMotoboy) return
    setIsUpdating(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motoboyId: selectedMotoboy, status: 'ACEITO' }),
      })
      const data = await response.json()
      if (data.success) {
        setPedido(data.data)
        setSuccess('Entregador atribuído ao pedido.')
        setSelectedMotoboy('')
      } else {
        setError(data.error || 'Erro ao atribuir entregador')
      }
    } catch {
      setError('Erro ao atribuir entregador')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelar = async () => {
    setIsUpdating(true)
    setError('')
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCancelamento: 'Cancelado pelo administrador' }),
      })
      const data = await response.json()
      if (data.success) {
        setPedido({ ...pedido!, status: 'CANCELADO', canceladoEm: new Date().toISOString(), motivoCancelamento: 'Cancelado pelo administrador' })
        setSuccess('Pedido cancelado.')
      } else {
        setError(data.error || 'Erro ao cancelar')
      }
    } catch {
      setError('Erro ao cancelar pedido')
    } finally {
      setIsUpdating(false)
      setConfirmarCancelamento(false)
    }
  }

  if (status === 'loading' || isLoading) return <PageLoader label="Carregando pedido…" />

  if (error && !pedido) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={error}
        action={<Link href="/dashboard/pedidos" className={buttonClass('outline')}>Voltar para pedidos</Link>}
      />
    )
  }

  if (!pedido) return null

  const podeCancelar = ['SOLICITADO', 'ACEITO'].includes(pedido.status)
  const podeAtribuir = pedido.status === 'SOLICITADO' && !pedido.motoboy

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/pedidos" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Pedidos
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-[22px] font-semibold tracking-tight text-fg">{codigoPedido(pedido.id)}</h1>
            <PedidoStatusBadge status={pedido.status} />
            <Badge variant="outline" size="md">{LABELS_TIPO_SERVICO[pedido.tipoServico]}</Badge>
          </div>
          <p className="mt-1 text-sm text-fg-3">Criado em {formatarDataHora(pedido.createdAt)}</p>
        </div>
        <p className="text-[26px] font-semibold tracking-tight tabular text-fg">{formatarMoeda(pedido.valorTotal)}</p>
      </div>

      {error && <Alert variant="danger" icon={AlertTriangle} className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" icon={CheckCircle2} className="mb-4">{success}</Alert>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {pedido.status === 'CANCELADO' && pedido.motivoCancelamento && (
            <Alert variant="danger" title="Pedido cancelado">{pedido.motivoCancelamento}</Alert>
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
            <CardHeader><CardTitle>Andamento</CardTitle></CardHeader>
            <LinhaDoTempo pedido={pedido} />
          </Card>

          {pedido.avaliacao && (
            <Card>
              <CardHeader><CardTitle>Avaliação do cliente</CardTitle></CardHeader>
              <Estrelas nota={pedido.avaliacao.nota} />
              {pedido.avaliacao.comentario && <p className="mt-2 text-sm text-fg-2">“{pedido.avaliacao.comentario}”</p>}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
            <p className="text-sm font-medium text-fg">{pedido.cliente.user.nome}</p>
            <div className="mt-2 space-y-1.5 text-[13px] text-fg-2">
              <a href={`mailto:${pedido.cliente.user.email}`} className="flex items-center gap-2 hover:text-fg"><Mail className="h-3.5 w-3.5 text-fg-3" />{pedido.cliente.user.email}</a>
              {pedido.cliente.user.telefone && (
                <a href={`tel:${pedido.cliente.user.telefone}`} className="flex items-center gap-2 hover:text-fg"><Phone className="h-3.5 w-3.5 text-fg-3" />{pedido.cliente.user.telefone}</a>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Entregador</CardTitle></CardHeader>
            {pedido.motoboy ? (
              <div>
                <p className="text-sm font-medium text-fg">{pedido.motoboy.user.nome}</p>
                <div className="mt-2 space-y-1.5 text-[13px] text-fg-2">
                  <a href={`tel:${pedido.motoboy.user.telefone}`} className="flex items-center gap-2 hover:text-fg"><Phone className="h-3.5 w-3.5 text-fg-3" />{pedido.motoboy.user.telefone}</a>
                  <p className="flex items-center gap-2"><Star className="h-3.5 w-3.5 fill-current text-chart-4" />{pedido.motoboy.avaliacaoMedia.toFixed(1)} de média</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-fg-3">Nenhum entregador atribuído.</p>
                {podeAtribuir && motoboys.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <Select
                      label="Entregadores disponíveis"
                      options={motoboys.map((m) => ({ value: m.id, label: m.user.nome }))}
                      value={selectedMotoboy}
                      onChange={(e) => setSelectedMotoboy(e.target.value)}
                      placeholder="Selecione"
                    />
                    {list.pagination.totalPages > 1 && (
                      <Pagination pagination={list.pagination} onPageChange={(page) => { setSelectedMotoboy(''); list.setPage(page) }} loading={list.loading} error={list.error} />
                    )}
                    <Button className="w-full" onClick={handleAtribuirMotoboy} isLoading={isUpdating} disabled={!selectedMotoboy}>
                      Atribuir entregador
                    </Button>
                  </div>
                )}
                {podeAtribuir && motoboys.length === 0 && !list.loading && (
                  <Alert variant="warning" className="mt-3">Nenhum entregador disponível agora.</Alert>
                )}
              </div>
            )}
          </Card>

          {podeCancelar && (
            <Card>
              <CardHeader>
                <CardTitle>Cancelamento</CardTitle>
              </CardHeader>
              {confirmarCancelamento ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-fg-2">Esta ação não pode ser desfeita. Deseja cancelar este pedido?</p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setConfirmarCancelamento(false)} disabled={isUpdating}>Voltar</Button>
                    <Button variant="danger" className="flex-1" onClick={handleCancelar} isLoading={isUpdating}>Cancelar pedido</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full text-danger" onClick={() => setConfirmarCancelamento(true)}>
                  Cancelar pedido
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
