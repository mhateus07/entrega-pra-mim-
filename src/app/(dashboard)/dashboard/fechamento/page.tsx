'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { buttonClass } from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Alert, EmptyState, PageHeader, Segmented } from '@/components/ui/Feedback'
import { TableCard, Table, THead, TBody, TH, TD } from '@/components/ui/Table'
import { formatarMoeda } from '@/lib/pricing'
import { cn } from '@/utils/cn'

type Visao = 'motoboy' | 'cliente'
interface LinhaMotoboy { motoboyId: string; nome: string; corridas: number; km: number; valorCorridas: number; repasse: number; dinheiroRecebido: number; saldoAcerto: number }
interface LinhaCliente { clienteId: string; nome: string; corridas: number; km: number; valorTotal: number; pago: number; aCobrar: number }

// Datas no fuso do navegador (o mesmo da central, na prática)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function periodo(chave: string): [string, string] {
  const hoje = new Date()
  if (chave === 'ontem') { const d = new Date(hoje); d.setDate(d.getDate() - 1); return [iso(d), iso(d)] }
  if (chave === 'mes') return [iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), iso(hoje)]
  if (chave === 'mesPassado') return [iso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)), iso(new Date(hoje.getFullYear(), hoje.getMonth(), 0))]
  return [iso(hoje), iso(hoje)]
}
const ATALHOS = [
  { value: 'hoje', label: 'Hoje' }, { value: 'ontem', label: 'Ontem' },
  { value: 'mes', label: 'Este mês' }, { value: 'mesPassado', label: 'Mês passado' },
]

export default function FechamentoPage() {
  const [visao, setVisao] = useState<Visao>('motoboy')
  const [[de, ate], setPeriodo] = useState<[string, string]>(() => periodo('hoje'))
  const [linhas, setLinhas] = useState<(LinhaMotoboy | LinhaCliente)[] | null>(null)
  const [repasse, setRepasse] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const consulta = `de=${de}&ate=${ate}&visao=${visao}`

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/fechamento?${consulta}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((body) => {
        if (!body.success) { setErro(body.error); setLinhas([]); return }
        setErro(null)
        setLinhas(body.data.linhas)
        if (body.data.repasse != null) setRepasse(body.data.repasse)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [consulta])

  const totais = useMemo(() => {
    const soma = (campo: string) => (linhas ?? []).reduce((acc, l) => acc + Number((l as unknown as Record<string, number>)[campo] ?? 0), 0)
    return visao === 'motoboy'
      ? { corridas: soma('corridas'), km: soma('km'), a: soma('valorCorridas'), b: soma('repasse'), c: soma('dinheiroRecebido'), d: soma('saldoAcerto') }
      : { corridas: soma('corridas'), km: soma('km'), a: soma('valorTotal'), b: soma('pago'), c: soma('aCobrar'), d: 0 }
  }, [linhas, visao])

  return (
    <>
      <PageHeader
        title="Fechamento"
        description="Corridas entregues no período: quanto pagar a cada motoboy e quanto cobrar de cada empresa cliente."
        actions={
          <a href={`/api/fechamento?${consulta}&formato=csv`} className={buttonClass('outline', 'md')}>
            <Download className="h-4 w-4" /> Exportar CSV
          </a>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Segmented value={visao} onChange={(v) => { setLinhas(null); setVisao(v) }}
          options={[{ value: 'motoboy', label: 'Por motoboy' }, { value: 'cliente', label: 'Por empresa cliente' }]} />
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap gap-1">
            {ATALHOS.map((a) => (
              <button key={a.value} type="button" onClick={() => setPeriodo(periodo(a.value))}
                className="h-9 rounded-lg border border-line bg-surface px-3 text-[13px] text-fg-2 hover:bg-surface-2">{a.label}</button>
            ))}
          </div>
          <div className="w-40"><Input label="De" type="date" value={de} max={ate} onChange={(e) => e.target.value && setPeriodo([e.target.value, ate])} /></div>
          <div className="w-40"><Input label="Até" type="date" value={ate} min={de} onChange={(e) => e.target.value && setPeriodo([de, e.target.value])} /></div>
        </div>
      </div>

      {erro && <Alert variant="danger" className="mb-4">{erro}</Alert>}
      {visao === 'motoboy' && repasse != null && (
        <p className="mb-3 text-[13px] text-fg-3">
          Repasse de {Math.round(repasse * 100)}% do valor das corridas (ajuste em Preços). Saldo do acerto = repasse − dinheiro que o motoboy recebeu em mãos; negativo significa que ele deve devolver à central.
        </p>
      )}

      <TableCard>
        {linhas === null ? (
          <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
        ) : linhas.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title="Nenhuma corrida entregue no período" description="Escolha outro período." />
        ) : (
          <Table className="min-w-[760px]">
            <THead>
              {visao === 'motoboy' ? (
                <tr><TH>Motoboy</TH><TH className="text-right">Corridas</TH><TH className="text-right">Km</TH><TH className="text-right">Valor das corridas</TH><TH className="text-right">Repasse</TH><TH className="text-right">Dinheiro recebido</TH><TH className="text-right">Saldo do acerto</TH></tr>
              ) : (
                <tr><TH>Empresa cliente</TH><TH className="text-right">Corridas</TH><TH className="text-right">Km</TH><TH className="text-right">Valor total</TH><TH className="text-right">Já pago</TH><TH className="text-right">A cobrar</TH></tr>
              )}
            </THead>
            <TBody>
              {visao === 'motoboy'
                ? (linhas as LinhaMotoboy[]).map((l) => (
                  <tr key={l.motoboyId}>
                    <TD className="font-medium text-fg">{l.nome}</TD>
                    <TD className="text-right tabular">{l.corridas}</TD>
                    <TD className="text-right tabular">{l.km.toLocaleString('pt-BR')}</TD>
                    <TD className="text-right font-mono tabular">{formatarMoeda(l.valorCorridas)}</TD>
                    <TD className="text-right font-mono tabular">{formatarMoeda(l.repasse)}</TD>
                    <TD className="text-right font-mono tabular">{formatarMoeda(l.dinheiroRecebido)}</TD>
                    <TD className={cn('text-right font-mono font-semibold tabular', l.saldoAcerto < 0 ? 'text-danger' : 'text-fg')}>{formatarMoeda(l.saldoAcerto)}</TD>
                  </tr>
                ))
                : (linhas as LinhaCliente[]).map((l) => (
                  <tr key={l.clienteId}>
                    <TD className="font-medium text-fg">{l.nome}</TD>
                    <TD className="text-right tabular">{l.corridas}</TD>
                    <TD className="text-right tabular">{l.km.toLocaleString('pt-BR')}</TD>
                    <TD className="text-right font-mono tabular">{formatarMoeda(l.valorTotal)}</TD>
                    <TD className="text-right font-mono tabular">{formatarMoeda(l.pago)}</TD>
                    <TD className="text-right font-mono font-semibold tabular text-fg">{formatarMoeda(l.aCobrar)}</TD>
                  </tr>
                ))}
              <tr className="bg-surface-2/60 font-semibold">
                <TD className="text-fg">Total</TD>
                <TD className="text-right tabular">{totais.corridas}</TD>
                <TD className="text-right tabular">{(Math.round(totais.km * 10) / 10).toLocaleString('pt-BR')}</TD>
                <TD className="text-right font-mono tabular">{formatarMoeda(totais.a)}</TD>
                <TD className="text-right font-mono tabular">{formatarMoeda(totais.b)}</TD>
                <TD className="text-right font-mono tabular">{formatarMoeda(totais.c)}</TD>
                {visao === 'motoboy' && <TD className="text-right font-mono tabular">{formatarMoeda(totais.d)}</TD>}
              </tr>
            </TBody>
          </Table>
        )}
      </TableCard>
    </>
  )
}
