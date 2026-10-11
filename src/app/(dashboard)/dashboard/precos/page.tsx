'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardTitle } from '@/components/ui/Card'
import { Alert, PageHeader, PageLoader } from '@/components/ui/Feedback'
import { calcularPrecoComRegra, formatarMoeda, normalizarBairro, type RegraPreco } from '@/lib/pricing'
import { LABELS_TIPO_SERVICO } from '@/utils/helpers'

type Tipo = 'AGENDADA' | 'DOCUMENTOS' | 'EXPRESSA'
const TIPOS: Tipo[] = ['AGENDADA', 'DOCUMENTOS', 'EXPRESSA']

interface Tabela {
  precoPorKm: number
  valorMinimo: number
  multiplicadores: Record<Tipo, number>
  bairros: { nome: string; valor: number }[]
}

const numero = (v: string) => Number(v.replace(',', '.'))

export default function PrecosPage() {
  const { data: session } = useSession()
  const podeEditar = session?.user?.orgRole === 'OWNER'
  const [tabela, setTabela] = useState<Tabela | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [kmExemplo, setKmExemplo] = useState(5)

  useEffect(() => {
    fetch('/api/organizacao/precos')
      .then((r) => r.json())
      .then((body) => (body.success ? setTabela(body.data) : setErro(body.error)))
      .catch(() => setErro('Não foi possível carregar a tabela'))
  }, [])

  const regra: RegraPreco | null = useMemo(() => tabela && ({
    precoPorKm: tabela.precoPorKm,
    valorMinimo: tabela.valorMinimo,
    multiplicadores: tabela.multiplicadores,
    bairros: Object.fromEntries(tabela.bairros.map((b) => [normalizarBairro(b.nome), b.valor])),
  }), [tabela])

  const salvar = async () => {
    if (!tabela) return
    setSalvando(true)
    try {
      const response = await fetch('/api/organizacao/precos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tabela),
      })
      const body = await response.json()
      if (!body.success) throw new Error(body.error)
      setTabela(body.data)
      toast.success('Tabela salva. Vale para os próximos pedidos.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  if (erro) return <Alert variant="danger" title="Erro">{erro}</Alert>
  if (!tabela || !regra) return <PageLoader />

  const set = (parcial: Partial<Tabela>) => setTabela({ ...tabela, ...parcial })

  return (
    <>
      <PageHeader
        title="Tabela de preço"
        description="Como sua central cobra cada entrega. Pedidos já criados mantêm o preço do momento em que foram feitos."
        actions={podeEditar && (
          <Button onClick={salvar} isLoading={salvando}><Save className="h-4 w-4" /> Salvar</Button>
        )}
      />
      {!podeEditar && <Alert variant="info" className="mb-4">Somente o dono da central altera a tabela de preço.</Alert>}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardTitle>Preço por distância</CardTitle>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input label="Preço por km (R$)" type="number" min={0} step="0.01" disabled={!podeEditar}
                value={tabela.precoPorKm} onChange={(e) => set({ precoPorKm: numero(e.target.value) })} />
              <Input label="Valor mínimo da corrida (R$)" type="number" min={0} step="0.01" disabled={!podeEditar}
                value={tabela.valorMinimo} onChange={(e) => set({ valorMinimo: numero(e.target.value) })} />
            </div>
            <p className="mt-4 text-[13px] font-medium text-fg-2">Multiplicador por tipo de serviço</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {TIPOS.map((t) => (
                <Input key={t} label={LABELS_TIPO_SERVICO[t]} type="number" min={0.1} step="0.05" disabled={!podeEditar}
                  value={tabela.multiplicadores[t]}
                  onChange={(e) => set({ multiplicadores: { ...tabela.multiplicadores, [t]: numero(e.target.value) } })} />
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Preço fixo por bairro</CardTitle>
                <p className="mt-1 text-[13px] text-fg-3">Quando o destino é um destes bairros, o valor fixo substitui o cálculo por km (o multiplicador do serviço continua valendo).</p>
              </div>
              {podeEditar && (
                <Button variant="outline" size="sm" onClick={() => set({ bairros: [...tabela.bairros, { nome: '', valor: 0 }] })}>
                  <Plus className="h-3.5 w-3.5" /> Bairro
                </Button>
              )}
            </div>
            {tabela.bairros.length === 0 ? (
              <p className="mt-4 text-sm text-fg-3">Nenhum bairro com preço fixo.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {tabela.bairros.map((b, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <Input label={i === 0 ? 'Bairro' : undefined} aria-label="Bairro" value={b.nome} disabled={!podeEditar}
                      onChange={(e) => set({ bairros: tabela.bairros.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} />
                    <div className="w-36 shrink-0">
                      <Input label={i === 0 ? 'Valor (R$)' : undefined} aria-label="Valor" type="number" min={0} step="0.01" value={b.valor} disabled={!podeEditar}
                        onChange={(e) => set({ bairros: tabela.bairros.map((x, j) => (j === i ? { ...x, valor: numero(e.target.value) } : x)) })} />
                    </div>
                    {podeEditar && (
                      <Button variant="ghost" size="icon" aria-label="Remover bairro"
                        onClick={() => set({ bairros: tabela.bairros.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardTitle>Simulação</CardTitle>
          <div className="mt-4">
            <Input label="Distância (km)" type="number" min={0} step="0.5" value={kmExemplo}
              onChange={(e) => setKmExemplo(numero(e.target.value) || 0)} />
          </div>
          <dl className="mt-4 space-y-2">
            {TIPOS.map((t) => (
              <div key={t} className="flex items-center justify-between text-sm">
                <dt className="text-fg-2">{LABELS_TIPO_SERVICO[t]}</dt>
                <dd className="font-semibold tabular text-fg">{formatarMoeda(calcularPrecoComRegra(regra, kmExemplo, t).valorTotal)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  )
}
