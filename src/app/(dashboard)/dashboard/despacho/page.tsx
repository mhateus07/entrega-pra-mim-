'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Radio, RotateCcw, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { EmptyState, PageHeader } from '@/components/ui/Feedback'
import { formatarMoeda } from '@/lib/pricing'
import { LABELS_TIPO_SERVICO, codigoPedido } from '@/utils/helpers'
import type { TipoServico } from '@prisma/client'
import ConsoleOperacional from '@/components/org/ConsoleOperacional'
import { Alert } from '@/components/ui/Feedback'

interface PedidoFila {
  id: string; createdAt: string; tipoServico: TipoServico; dataAgendada: string | null; valorTotal: number
  despachoManual: boolean; tentativasDespacho: number
  cliente: { razaoSocial: string | null; user: { nome: string } }
  enderecoOrigem: { bairro: string }; enderecoDestino: { bairro: string }
  ofertas: { id: string; expiresAt: string; tentativa: number; motoboy: { user: { nome: string } } }[]
}
interface Fila { manual: PedidoFila[]; emOferta: PedidoFila[]; motoboysDisponiveis: { id: string; nome: string }[] }

function Rota({ p }: { p: PedidoFila }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-sm font-medium text-fg">
        <Link href={`/dashboard/pedidos/${p.id}`} className="font-mono hover:underline">{codigoPedido(p.id)}</Link>
        <Badge variant="outline">{LABELS_TIPO_SERVICO[p.tipoServico]}</Badge>
      </p>
      <p className="truncate text-[13px] text-fg-2">{p.cliente.razaoSocial || p.cliente.user.nome} · {p.enderecoOrigem.bairro} → {p.enderecoDestino.bairro}</p>
      <p className="text-xs text-fg-3">
        {formatarMoeda(p.valorTotal)} · criado às {new Date(p.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        {p.dataAgendada && ` · agendado para ${new Date(p.dataAgendada).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`}
      </p>
    </div>
  )
}

// Fila do despachante: pedidos sem motoboy (atribuição manual) e ofertas em andamento
export default function DespachoPage() {
  const [fila, setFila] = useState<Fila | null>(null)
  const [escolha, setEscolha] = useState<Record<string, string>>({})
  const [agora, setAgora] = useState(() => Date.now())
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)

  const carregar = useCallback(() => {
    fetch('/api/despacho/fila').then((r) => r.json()).then((b) => { if (!b.success) throw new Error(b.error); setFila(b.data); setErro('') }).catch(() => setErro('Não foi possível atualizar a fila. Verifique a conexão.'))
  }, [])
  useEffect(() => {
    carregar()
    const dados = setInterval(carregar, 5000)
    const relogio = setInterval(() => setAgora(Date.now()), 1000)
    return () => { clearInterval(dados); clearInterval(relogio) }
  }, [carregar])

  const atribuir = async (pedidoId: string) => {
    if (ocupado) return
    const motoboyId = escolha[pedidoId]
    if (!motoboyId) return toast.error('Escolha o motoboy')
    setOcupado(pedidoId)
    try {
    const body = await (await fetch(`/api/pedidos/${pedidoId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ACEITO', motoboyId }),
    })).json()
    if (body.success) { toast.success('Pedido atribuído'); carregar() } else toast.error(body.error)
    } catch { toast.error('Não foi possível confirmar a atribuição. Atualize a fila.') } finally { setOcupado(null) }
  }

  const reofertar = async (pedidoId: string) => {
    if (ocupado) return
    setOcupado(pedidoId)
    try {
    const body = await (await fetch('/api/despacho/fila', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedidoId }),
    })).json()
    if (!body.success) return toast.error(body.error)
    toast[body.data.tipo === 'ofertado' ? 'success' : 'error'](body.data.tipo === 'ofertado' ? 'Oferta enviada' : 'Nenhum motoboy online para ofertar')
    carregar()
    } catch { toast.error('Não foi possível confirmar a nova oferta. Atualize a fila.') } finally { setOcupado(null) }
  }

  return (
    <>
      <PageHeader title="Despacho" description="O sistema oferece cada corrida ao melhor motoboy online e passa ao próximo se ele não aceitar a tempo. Depois das tentativas, o pedido vem para a fila abaixo." />
      <ConsoleOperacional />
      {erro && <Alert variant="warning" className="mb-4">{erro}<Button variant="ghost" onClick={carregar}>Tentar novamente</Button></Alert>}

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-fg-2">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" /> Sem motoboy ({fila?.manual.length ?? 0})
        </h2>
        {!fila ? <div className="skeleton h-24 rounded-xl" /> : fila.manual.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-surface">
            <EmptyState icon={UserCheck} title="Fila vazia" description="Nenhum pedido esperando atribuição manual." />
          </div>
        ) : (
          <ul className="space-y-2">
            {fila.manual.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-surface p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
                <Rota p={p} />
                <div className="flex flex-wrap items-center gap-2">
                  <select value={escolha[p.id] ?? ''} onChange={(e) => setEscolha({ ...escolha, [p.id]: e.target.value })} aria-label="Motoboy"
                    className="h-8 rounded-md border border-line bg-surface px-2 text-[13px] text-fg">
                    <option value="">{fila.motoboysDisponiveis.length ? 'Escolher motoboy' : 'Nenhum online'}</option>
                    {fila.motoboysDisponiveis.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  <Button size="sm" onClick={() => atribuir(p.id)} disabled={!escolha[p.id] || !!ocupado}>Atribuir</Button>
                  <Button size="sm" variant="outline" disabled={!!ocupado} onClick={() => reofertar(p.id)}><RotateCcw className="h-3.5 w-3.5" /> Ofertar de novo</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-fg-2">
          <Radio className="h-4 w-4 text-brand" aria-hidden="true" /> Em oferta ({fila?.emOferta.length ?? 0})
        </h2>
        {fila && fila.emOferta.length === 0 ? (
          <p className="text-sm text-fg-3">Nenhum pedido aguardando aceite.</p>
        ) : (
          <ul className="space-y-2">
            {fila?.emOferta.map((p) => {
              const oferta = p.ofertas[0]
              const segundos = oferta ? Math.max(0, Math.round((new Date(oferta.expiresAt).getTime() - agora) / 1000)) : null
              return (
                <li key={p.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
                  <Rota p={p} />
                  <p className="text-[13px] text-fg-2">
                    {oferta
                      ? <>Oferecido a <span className="font-medium text-fg">{oferta.motoboy.user.nome}</span> · tentativa {oferta.tentativa} · <span className="tabular">{segundos}s</span></>
                      : p.dataAgendada ? 'Agendado: entra no despacho 30 min antes' : 'Preparando oferta…'}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
