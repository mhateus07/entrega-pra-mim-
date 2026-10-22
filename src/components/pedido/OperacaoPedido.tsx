'use client'

import { useCallback, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { Alert } from '@/components/ui/Feedback'

interface Dados {
  podeGerenciar: boolean
  destinatarioNome: string | null
  destinatarioTelefone: string | null
  referenciaCliente: string | null
  eventos: { id: string; descricao: string; createdAt: string }[]
  ocorrencias: { id: string; tipo: string; descricao: string; resolucao: string | null; resolvidaEm: string | null }[]
}
const TIPOS = [['DESTINATARIO_AUSENTE', 'Destinatário ausente'], ['ENDERECO_INCORRETO', 'Endereço incorreto'], ['LOCAL_FECHADO', 'Local fechado'], ['AVARIA', 'Avaria'], ['SEM_CONTATO', 'Sem contato'], ['OUTRO', 'Outro problema']]

export default function OperacaoPedido({ pedidoId }: { pedidoId: string }) {
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [tipo, setTipo] = useState('DESTINATARIO_AUSENTE')
  const [descricao, setDescricao] = useState('')
  const [resolucoes, setResolucoes] = useState<Record<string, string>>({})
  const [motoboys, setMotoboys] = useState<{ id: string; nome: string }[]>([])
  const [motoboyId, setMotoboyId] = useState('')
  const [motivo, setMotivo] = useState('')
  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/pedidos/${pedidoId}/operacao`)
      const b = await r.json()
      if (!b.success) throw new Error(b.error)
      setDados(b.data); setErro('')
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível atualizar o histórico') }
  }, [pedidoId])
  useEffect(() => { void carregar(); const t = setInterval(carregar, 15000); return () => clearInterval(t) }, [carregar])
  async function enviar(body: object) {
    setOcupado(true); setErro('')
    try {
      const b = await (await fetch(`/api/pedidos/${pedidoId}/operacao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json()
      if (!b.success) throw new Error(b.error)
      setDescricao(''); await carregar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha de conexão. Tente novamente.') }
    finally { setOcupado(false) }
  }
  return <section className="my-5 space-y-5 rounded-2xl border border-line bg-surface p-5">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Acompanhamento da entrega</h2><Button variant="ghost" size="sm" onClick={carregar}>Atualizar</Button></div>
    {erro && <Alert variant="danger">{erro}</Alert>}
    {dados?.destinatarioNome && <div className="rounded-xl bg-surface-2 p-4"><p className="text-xs text-fg-3">Quem recebe</p><p className="font-medium">{dados.destinatarioNome}</p>{dados.destinatarioTelefone && <a className="text-sm underline" href={`tel:${dados.destinatarioTelefone.replace(/[^+\d]/g, '')}`}>{dados.destinatarioTelefone}</a>}{dados.referenciaCliente && <p className="text-sm text-fg-2">Referência: {dados.referenciaCliente}</p>}</div>}
    <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer font-medium">Registrar um problema</summary><div className="mt-4 space-y-3">
      <label className="block text-sm">O que aconteceu?<select className="mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3" value={tipo} onChange={e => setTipo(e.target.value)}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <Textarea label="Descreva o problema" value={descricao} onChange={e => setDescricao(e.target.value)} maxLength={1000} />
      <Button isLoading={ocupado} disabled={descricao.trim().length < 5} onClick={() => enviar({ acao: 'ocorrencia', tipo, descricao })}>Registrar ocorrência</Button>
    </div></details>
    {dados?.ocorrencias.map(o => <div key={o.id} className={`rounded-xl border p-4 ${o.resolvidaEm ? 'border-line' : 'border-warning/40 bg-warning-soft/30'}`}><p className="text-sm font-semibold">{TIPOS.find(([v]) => v === o.tipo)?.[1] ?? o.tipo} · {o.resolvidaEm ? 'Resolvida' : 'Pendente'}</p><p className="mt-1 text-sm text-fg-2">{o.descricao}</p>{o.resolucao && <p className="mt-2 text-sm">Solução: {o.resolucao}</p>}{dados.podeGerenciar && !o.resolvidaEm && <div className="mt-3 space-y-2"><Input label="Como foi resolvido?" value={resolucoes[o.id] ?? ''} onChange={e => setResolucoes({ ...resolucoes, [o.id]: e.target.value })} maxLength={1000} /><Button size="sm" disabled={(resolucoes[o.id]?.trim().length ?? 0) < 5} isLoading={ocupado} onClick={() => enviar({ acao: 'resolver', ocorrenciaId: o.id, resolucao: resolucoes[o.id] })}>Marcar resolvida</Button></div>}</div>)}
    {dados?.podeGerenciar && <details className="rounded-xl border border-line p-4" onToggle={async e => { if (!e.currentTarget.open) return; try { const b = await (await fetch('/api/despacho/fila')).json(); if (!b.success) throw new Error(b.error); setMotoboys(b.data.motoboysDisponiveis) } catch { setErro('Não foi possível listar os entregadores') } }}><summary className="cursor-pointer font-medium">Trocar entregador antes da retirada</summary><div className="mt-4 space-y-3"><label className="block text-sm">Novo entregador<select className="mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3" value={motoboyId} onChange={e => setMotoboyId(e.target.value)}><option value="">Escolha um entregador disponível</option>{motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></label><Input label="Motivo da troca" value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={400} /><Button disabled={!motoboyId || motivo.trim().length < 5} isLoading={ocupado} onClick={() => enviar({ acao: 'reatribuir', motoboyId, motivo })}>Confirmar troca</Button></div></details>}
    <div><h3 className="mb-3 text-sm font-semibold">Histórico</h3><ol className="space-y-3 border-l border-line pl-4">{dados?.eventos.map(e => <li key={e.id}><p className="text-sm">{e.descricao}</p><time className="text-xs text-fg-3">{new Date(e.createdAt).toLocaleString('pt-BR')}</time></li>)}</ol>{dados?.eventos.length === 0 && <p className="text-sm text-fg-3">Eventos anteriores à atualização não foram reconstruídos.</p>}</div>
  </section>
}
