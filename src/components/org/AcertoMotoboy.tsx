'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Alert } from '@/components/ui/Feedback'
import { formatarMoeda } from '@/lib/pricing'

interface Extrato { ganhos: number; dinheiro: number; acertado: number; aAcertar: number; legadosEstimados: number; podeRegistrar: boolean; acertos: { id: string; valor: number; referencia: string; createdAt: string }[] }
export default function AcertoMotoboy({ motoboyId }: { motoboyId: string }) {
  const [dados, setDados] = useState<Extrato | null>(null)
  const [erro, setErro] = useState('')
  const [valor, setValor] = useState('')
  const [referencia, setReferencia] = useState('')
  const [direcao, setDirecao] = useState('pagar')
  const [salvando, setSalvando] = useState(false)
  const chave = useRef<string | null>(null)
  const carregar = useCallback(async () => {
    try { const b = await (await fetch(`/api/acertos?motoboyId=${encodeURIComponent(motoboyId)}`)).json(); if (!b.success) throw new Error(b.error); setDados(b.data); setErro('') }
    catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao consultar os acertos') }
  }, [motoboyId])
  useEffect(() => { void carregar() }, [carregar])
  return <section className="my-5 space-y-4 rounded-2xl border border-line bg-surface p-5"><div className="flex justify-between"><h2 className="text-lg font-semibold">Acerto com a central</h2><Button variant="ghost" size="sm" onClick={carregar}>Atualizar</Button></div>
    <p className="text-sm text-fg-3">Acumulado de todas as entregas concluídas. Registros confirmam valores acertados fora do sistema; não realizam transferências.</p>
    {erro && <Alert variant="danger">{erro}</Alert>}
    {!!dados?.legadosEstimados && <Alert variant="warning">Há {dados.legadosEstimados} entregas antigas com repasse estimado. Reconcilie o histórico antes de registrar novos acertos.</Alert>}
    {dados && <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Remuneração', dados.ganhos], ['Dinheiro em mãos', dados.dinheiro], ['Acertos registrados', dados.acertado], [dados.aAcertar < 0 ? 'A devolver à central' : 'A receber da central', Math.abs(dados.aAcertar)]].map(([l, v]) => <div key={l} className="rounded-xl bg-surface-2 p-3"><p className="text-xs text-fg-3">{l}</p><p className="mt-2 font-mono font-semibold">{formatarMoeda(Number(v))}</p></div>)}</div>
    {dados.podeRegistrar && <form className="grid gap-3 sm:grid-cols-2" onSubmit={async e => { e.preventDefault(); setSalvando(true); try { chave.current ??= crypto.randomUUID(); const b = await (await fetch('/api/acertos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motoboyId, chave: chave.current, valor: Number(valor) * (direcao === 'pagar' ? 1 : -1), referencia }) })).json(); if (!b.success) throw new Error(b.error); chave.current = null; setValor(''); setReferencia(''); await carregar() } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível confirmar. Atualize antes de tentar novamente.') } finally { setSalvando(false) } }}>
      <label className="text-sm">Movimentação<select disabled={salvando} value={direcao} onChange={e => { setDirecao(e.target.value); chave.current = null }} className="mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3"><option value="pagar">Central pagou ao entregador</option><option value="receber">Entregador devolveu à central</option></select></label>
      <Input label="Valor acertado (R$)" type="number" min="0.01" max="1000000" step="0.01" required disabled={salvando} value={valor} onChange={e => { setValor(e.target.value); chave.current = null }} />
      <Input label="Referência / identificação do comprovante" minLength={5} maxLength={200} required disabled={salvando} value={referencia} onChange={e => { setReferencia(e.target.value); chave.current = null }} />
      <div className="flex items-end"><Button type="submit" isLoading={salvando}>Registrar acerto realizado</Button></div>
    </form>}
    <ul className="divide-y divide-line">{dados.acertos.map(a => <li key={a.id} className="flex justify-between gap-3 py-3 text-sm"><div><p>{a.referencia}</p><time className="text-xs text-fg-3">{new Date(a.createdAt).toLocaleString('pt-BR')}</time></div><span className="font-mono">{formatarMoeda(a.valor)}</span></li>)}</ul></>}
  </section>
}
