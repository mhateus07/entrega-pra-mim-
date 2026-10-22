'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import TrackingMap from '@/components/maps/TrackingMap'
import OperacaoPedido from '@/components/pedido/OperacaoPedido'
import { Alert } from '@/components/ui/Feedback'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { codigoPedido } from '@/utils/helpers'

interface Ponto { bairro: string; latitude: number | null; longitude: number | null }
interface Pedido { id: string; status: string; minutos: number; atrasado: boolean; enderecoOrigem: Ponto; enderecoDestino: Ponto; cliente: { user: { nome: string } }; motoboy: { latitudeAtual: number | null; longitudeAtual: number | null; localizacaoEm: string | null; user: { nome: string } } | null }
interface Config { atrasoColetaMinutos: number; atrasoEntregaMinutos: number; telefoneSuporte: string | null; despachoTtlSegundos: number; despachoMaxTentativas: number }
interface Dados { config: Config; pedidos: Pedido[]; ocorrencias: { id: string; pedidoId: string; tipo: string; descricao: string }[] }
const ponto = (p: Ponto) => p.latitude != null && p.longitude != null ? { lat: p.latitude, lng: p.longitude, label: p.bairro } : null

export default function ConsoleOperacional() {
  const { data: session } = useSession()
  const [dados, setDados] = useState<Dados | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [erro, setErro] = useState('')
  const [atualizado, setAtualizado] = useState<Date | null>(null)
  const [selecionado, setSelecionado] = useState('')
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')
  const carregar = useCallback(async () => {
    try { const b = await (await fetch('/api/operacao')).json(); if (!b.success) throw new Error(b.error); setDados(b.data); setConfig(c => c ?? b.data.config); setAtualizado(new Date()); setErro('') }
    catch (e) { setErro(e instanceof Error ? e.message : 'Sem conexão com a central') }
  }, [])
  useEffect(() => { void carregar(); const t = setInterval(carregar, 10000); return () => clearInterval(t) }, [carregar])
  const pedidos = dados?.pedidos.filter(p => `${p.id} ${p.cliente.user.nome} ${p.motoboy?.user.nome} ${p.enderecoDestino.bairro}`.toLowerCase().includes(busca.toLowerCase())) ?? []
  const pedido = dados?.pedidos.find(p => p.id === selecionado)
  const m = pedido?.motoboy
  const gps = m?.localizacaoEm && atualizado && atualizado.getTime() - new Date(m.localizacaoEm).getTime() < 120000 && m.latitudeAtual != null && m.longitudeAtual != null ? { lat: m.latitudeAtual, lng: m.longitudeAtual } : null
  return <section className="mb-8 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="titulo-display text-2xl">Sua operação, agora</h2><p className="mt-1 text-xs text-fg-3">{atualizado ? `Atualizado às ${atualizado.toLocaleTimeString('pt-BR')}` : 'Conectando à central…'} · até 100 corridas ativas</p></div><Button variant="outline" onClick={carregar}>Atualizar</Button></div>
    {erro && <Alert variant="warning">{erro}. Os dados abaixo podem estar desatualizados.</Alert>}
    <div className="grid grid-cols-3 gap-3">{[['Em andamento', dados?.pedidos.length ?? 0], ['Precisam de atenção', dados?.pedidos.filter(p => p.atrasado).length ?? 0], ['Ocorrências abertas', dados?.ocorrencias.length ?? 0]].map(([label, valor]) => <div key={label} className="rounded-2xl border border-line bg-surface p-4"><p className="text-xs text-fg-3">{label}</p><p className="mt-2 font-mono text-3xl">{valor}</p></div>)}</div>
    {!!dados?.ocorrencias.length && <div className="rounded-2xl border border-warning/40 bg-warning-soft/30 p-4"><h3 className="mb-3 font-semibold">Resolver primeiro</h3>{dados.ocorrencias.map(o => <button key={o.id} onClick={() => setSelecionado(o.pedidoId)} className="block w-full border-t border-warning/20 py-3 text-left text-sm"><span className="font-mono">{codigoPedido(o.pedidoId)}</span> · {o.tipo.replaceAll('_', ' ')}<span className="mt-1 block text-fg-2">{o.descricao}</span></button>)}</div>}
    <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]"><div className="rounded-2xl border border-line bg-surface p-4"><Input label="Buscar na operação" placeholder="Pedido, cliente, entregador ou bairro" value={busca} onChange={e => setBusca(e.target.value)} /><div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto">{pedidos.map(p => <button key={p.id} onClick={() => setSelecionado(p.id)} className={`w-full rounded-xl border p-4 text-left ${selecionado === p.id ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface-2'}`}><p className="flex justify-between gap-2 text-sm font-semibold"><span>{p.cliente.user.nome}</span><span className={p.atrasado ? 'text-warning' : 'text-fg-3'}>{p.minutos} min</span></p><p className="mt-1 text-sm text-fg-2">{p.enderecoOrigem.bairro} → {p.enderecoDestino.bairro}</p><p className="mt-2 text-xs text-fg-3">{codigoPedido(p.id)} · {p.motoboy?.user.nome ?? 'Sem entregador'} · {p.status.replaceAll('_', ' ')}</p></button>)}{!pedidos.length && <p className="py-10 text-center text-sm text-fg-3">Nenhuma corrida ativa para esta busca.</p>}</div></div>
      <div className="min-w-0 rounded-2xl border border-line bg-surface p-4">{selecionado ? <><div className="mb-3 flex justify-between gap-3"><h3 className="font-mono font-semibold">{codigoPedido(selecionado)}</h3><Link className="text-sm underline" href={`/dashboard/pedidos/${selecionado}`}>Abrir pedido completo</Link></div>{pedido && <TrackingMap key={pedido.id} origem={ponto(pedido.enderecoOrigem)} destino={ponto(pedido.enderecoDestino)} motoboyLocation={gps} className="h-64 overflow-hidden rounded-xl" />}<OperacaoPedido pedidoId={selecionado} /></> : <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><span className="mb-4 h-1 w-16 rounded bg-brand" /><h3 className="text-xl font-semibold">Cada corrida, no seu lugar.</h3><p className="mt-2 max-w-xs text-sm text-fg-3">Selecione uma entrega para ver o trajeto, acompanhar ocorrências e agir sem sair do despacho.</p></div>}</div>
    </div>
    {session?.user?.orgRole === 'OWNER' && config && <details className="rounded-2xl border border-line bg-surface p-5"><summary className="cursor-pointer font-semibold">Configurar alertas e atendimento</summary><form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={async e => { e.preventDefault(); setSalvando(true); setAviso(''); try { const b = await (await fetch('/api/operacao', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...config, telefoneSuporte: config.telefoneSuporte ?? '' }) })).json(); if (!b.success) throw new Error(b.error); setAviso('Configuração salva'); await carregar() } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar') } finally { setSalvando(false) } }}>
      {([['atrasoColetaMinutos', 'Alerta de coleta (min)', 5, 240], ['atrasoEntregaMinutos', 'Alerta de entrega (min)', 5, 480], ['despachoTtlSegundos', 'Prazo da oferta (seg)', 20, 300], ['despachoMaxTentativas', 'Tentativas automáticas', 1, 10]] as const).map(([k, label, min, max]) => <Input key={k} label={label} type="number" min={min} max={max} required value={config[k]} onChange={e => setConfig({ ...config, [k]: Number(e.target.value) })} />)}
      <Input label="Telefone de suporte no rastreio" type="tel" value={config.telefoneSuporte ?? ''} onChange={e => setConfig({ ...config, telefoneSuporte: e.target.value })} /><div className="flex items-end gap-3"><Button type="submit" isLoading={salvando}>Salvar configuração</Button><p role="status" className="text-sm text-success">{aviso}</p></div>
    </form></details>}
  </section>
}
