'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Inbox } from 'lucide-react'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import { PageHeader, Segmented, EmptyState } from '@/components/ui/Feedback'
import { PedidoStatusBadge } from '@/components/ui/StatusBadge'
import { TableCard, Table, THead, TBody, TH, TD } from '@/components/ui/Table'
import { formatarMoeda } from '@/lib/pricing'
import { LABELS_STATUS_PEDIDO, LABELS_TIPO_SERVICO, codigoPedido, formatarDataHora } from '@/utils/helpers'
import type { StatusPedido, TipoServico } from '@prisma/client'

interface Pedido {
  id: string
  status: StatusPedido
  tipoServico: TipoServico
  valorTotal: number
  distanciaKm: number
  createdAt: string
  cliente: { user: { nome: string; telefone: string } }
  motoboy: { user: { nome: string } } | null
  enderecoOrigem: { bairro: string; cidade: string }
  enderecoDestino: { bairro: string; cidade: string }
}

const STATUS: (StatusPedido | 'TODOS')[] = ['TODOS', 'SOLICITADO', 'ACEITO', 'EM_COLETA', 'EM_ENTREGA', 'ENTREGUE', 'CANCELADO']

export default function PedidosAdminPage() {
  const { status } = useSession()
  const router = useRouter()
  const [filtroStatus, setFiltroStatus] = useState<StatusPedido | 'TODOS'>('TODOS')
  const [filtroTipo, setFiltroTipo] = useState<TipoServico | ''>('')

  const params = new URLSearchParams()
  if (filtroStatus !== 'TODOS') params.set('status', filtroStatus)
  if (filtroTipo) params.set('tipoServico', filtroTipo)
  const query = params.toString()
  const list = usePaginatedList<Pedido>(status === 'authenticated' ? `/api/pedidos${query ? `?${query}` : ''}` : null, 30_000)
  const pedidos = list.data

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  return (
    <>
      <PageHeader
        title="Pedidos"
        description={list.loading ? 'Carregando…' : `${list.pagination.total} ${list.pagination.total === 1 ? 'pedido encontrado' : 'pedidos encontrados'}`}
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          value={filtroStatus}
          onChange={setFiltroStatus}
          options={STATUS.map((s) => ({ value: s, label: s === 'TODOS' ? 'Todos' : LABELS_STATUS_PEDIDO[s] }))}
        />
        <div className="w-full md:w-52">
          <Select
            aria-label="Tipo de serviço"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoServico | '')}
            options={[{ value: '', label: 'Todos os serviços' }, ...Object.entries(LABELS_TIPO_SERVICO).map(([value, label]) => ({ value, label }))]}
            className="h-9"
          />
        </div>
      </div>

      <TableCard>
        {pedidos.length === 0 ? (
          list.loading ? (
            <div className="space-y-2 p-5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
          ) : (
            <EmptyState icon={Inbox} title="Nenhum pedido encontrado" description="Ajuste os filtros para ver outros pedidos." />
          )
        ) : (
          <>
            {/* Mobile */}
            <ul className="divide-y divide-line md:hidden">
              {pedidos.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => router.push(`/dashboard/pedidos/${p.id}`)} className="w-full px-4 py-3.5 text-left hover:bg-surface-2/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{p.cliente.user.nome}</p>
                        <p className="mt-0.5 truncate text-[13px] text-fg-3">{p.enderecoOrigem.bairro} → {p.enderecoDestino.bairro}</p>
                      </div>
                      <PedidoStatusBadge status={p.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[13px]">
                      <span className="font-mono text-fg-3">{codigoPedido(p.id)} · {LABELS_TIPO_SERVICO[p.tipoServico]}</span>
                      <span className="font-medium tabular text-fg">{formatarMoeda(p.valorTotal)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <THead>
                  <tr>
                    <TH>Pedido</TH>
                    <TH>Cliente</TH>
                    <TH>Trajeto</TH>
                    <TH>Entregador</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Valor</TH>
                    <TH className="text-right">Criado em</TH>
                    <TH><span className="sr-only">Abrir</span></TH>
                  </tr>
                </THead>
                <TBody>
                  {pedidos.map((p) => (
                    <tr key={p.id} className="group cursor-pointer hover:bg-surface-2/60" onClick={() => router.push(`/dashboard/pedidos/${p.id}`)}>
                      <TD>
                        <p className="font-mono text-[13px] text-fg">{codigoPedido(p.id)}</p>
                        <p className="text-xs text-fg-3">{LABELS_TIPO_SERVICO[p.tipoServico]}</p>
                      </TD>
                      <TD>
                        <p className="max-w-[200px] truncate text-fg">{p.cliente.user.nome}</p>
                        <p className="text-xs text-fg-3">{p.cliente.user.telefone}</p>
                      </TD>
                      <TD>
                        <p className="text-fg-2">{p.enderecoOrigem.bairro} <span className="text-fg-3">→</span> {p.enderecoDestino.bairro}</p>
                        <p className="text-xs tabular text-fg-3">{p.distanciaKm.toFixed(1)} km</p>
                      </TD>
                      <TD>{p.motoboy ? <span className="text-fg-2">{p.motoboy.user.nome}</span> : <span className="text-fg-3">Não atribuído</span>}</TD>
                      <TD><PedidoStatusBadge status={p.status} /></TD>
                      <TD className="text-right font-medium tabular text-fg">{formatarMoeda(p.valorTotal)}</TD>
                      <TD className="whitespace-nowrap text-right tabular text-fg-3">{formatarDataHora(p.createdAt)}</TD>
                      <TD className="w-8"><ArrowRight className="h-4 w-4 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" /></TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </TableCard>
      <Pagination pagination={list.pagination} onPageChange={list.setPage} loading={list.loading} error={list.error} />
    </>
  )
}
