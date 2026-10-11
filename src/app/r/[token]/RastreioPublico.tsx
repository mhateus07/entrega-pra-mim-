'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Clock, MapPin, PackageX } from 'lucide-react'
import TrackingMap from '@/components/maps/TrackingMap'
import Logo from '@/components/brand/Logo'
import { cn } from '@/utils/cn'

interface Rastreio {
  status: 'SOLICITADO' | 'ACEITO' | 'EM_COLETA' | 'EM_ENTREGA' | 'ENTREGUE' | 'CANCELADO'
  horarios: Record<'criado' | 'aceito' | 'coletado' | 'entregue' | 'cancelado', string | null>
  origem: { bairro: string; cidade: string }
  destino: { bairro: string; cidade: string; latitude?: number; longitude?: number }
  motoboy: { nome: string } | null
  posicao: { latitude: number; longitude: number; atualizadoEm: string | null } | null
  etaMinutos: number | null
  comprovanteUrl: string | null
  central: { nome: string; corPrimaria: string | null; logoUrl: string | null }
  atualizadoEm: string
}

const ETAPAS = [
  { status: 'SOLICITADO', titulo: 'Pedido recebido', horario: 'criado' },
  { status: 'ACEITO', titulo: 'Entregador a caminho da coleta', horario: 'aceito' },
  { status: 'EM_ENTREGA', titulo: 'Saiu para entrega', horario: 'coletado' },
  { status: 'ENTREGUE', titulo: 'Entregue', horario: 'entregue' },
] as const
const ORDEM = ['SOLICITADO', 'ACEITO', 'EM_COLETA', 'EM_ENTREGA', 'ENTREGUE']

const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null)

export default function RastreioPublico({ token }: { token: string }) {
  const [dados, setDados] = useState<Rastreio | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    const carregar = () => fetch(`/api/publico/rastreio/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json()
        if (!ativo) return
        if (body.success) { setDados(body.data); setErro(null) } else setErro(body.error || 'Link inválido')
      })
      .catch(() => { if (ativo) setErro('Sem conexão. Tentando de novo…') })
    void carregar()
    const timer = setInterval(carregar, 10_000)
    return () => { ativo = false; clearInterval(timer) }
  }, [token])

  // Cor da central (plano Marca própria) sobrescreve o token da marca
  const estiloMarca = dados?.central.corPrimaria ? ({ '--brand': dados.central.corPrimaria } as React.CSSProperties) : undefined
  const indice = dados ? ORDEM.indexOf(dados.status) : -1
  const emEntrega = dados?.status === 'EM_ENTREGA'

  return (
    <div className="min-h-screen bg-page" style={estiloMarca}>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-4">
          {dados?.central.logoUrl
            // eslint-disable-next-line @next/next/no-img-element -- logo servido pela rota pública da central
            ? <img src={dados.central.logoUrl} alt={dados.central.nome} className="h-8 max-w-[140px] object-contain" />
            : !dados?.central.corPrimaria && <Logo markClassName="h-7 w-7" className="[&>span:last-child]:hidden" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{dados?.central.nome ?? 'Acompanhe sua entrega'}</p>
            <p className="text-xs text-fg-3">Acompanhamento da entrega</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 py-5">
        {erro && !dados && (
          <div className="rounded-xl border border-line bg-surface p-6 text-center">
            <PackageX className="mx-auto h-8 w-8 text-fg-3" aria-hidden="true" />
            <p className="mt-3 text-sm text-fg-2">{erro}</p>
          </div>
        )}
        {!dados && !erro && <div className="skeleton h-40 rounded-xl" />}

        {dados && (
          <>
            <section className="rounded-xl border border-line bg-surface p-5">
              {dados.status === 'CANCELADO' ? (
                <p className="text-lg font-semibold text-fg">Esta entrega foi cancelada</p>
              ) : (
                <>
                  <p className="text-[13px] text-fg-3">{dados.status === 'ENTREGUE' ? 'Entregue às' : 'Previsão'}</p>
                  <p className="text-2xl font-semibold tracking-tight text-fg">
                    {dados.status === 'ENTREGUE'
                      ? hora(dados.horarios.entregue)
                      : dados.etaMinutos != null ? `cerca de ${dados.etaMinutos} min` : 'aguardando entregador'}
                  </p>
                  {dados.etaMinutos != null && dados.status !== 'ENTREGUE' && (
                    <p className="mt-1 text-xs text-fg-3">Estimativa aproximada, atualizada às {hora(dados.posicao?.atualizadoEm ?? dados.atualizadoEm)}</p>
                  )}
                </>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-sm text-fg-2">
                <MapPin className="h-4 w-4 text-fg-3" aria-hidden="true" />
                {dados.origem.bairro} → {dados.destino.bairro}, {dados.destino.cidade}
              </p>
              {dados.motoboy && <p className="mt-1 text-sm text-fg-2">Entregador: <span className="font-medium text-fg">{dados.motoboy.nome}</span></p>}
            </section>

            {emEntrega && dados.posicao && dados.destino.latitude != null && (
              <TrackingMap
                className="h-72 overflow-hidden rounded-xl border border-line"
                origem={null}
                destino={{ lat: dados.destino.latitude, lng: dados.destino.longitude!, label: 'Destino' }}
                motoboyLocation={{ lat: dados.posicao.latitude, lng: dados.posicao.longitude, label: dados.motoboy?.nome }}
              />
            )}

            {dados.status !== 'CANCELADO' && (
              <ol className="rounded-xl border border-line bg-surface p-5">
                {ETAPAS.map((etapa) => {
                  const feito = indice >= ORDEM.indexOf(etapa.status)
                  return (
                    <li key={etapa.status} className="flex items-start gap-3 py-1.5">
                      {feito
                        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                        : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-fg-3" aria-hidden="true" />}
                      <div className="flex-1">
                        <p className={cn('text-sm', feito ? 'font-medium text-fg' : 'text-fg-3')}>{etapa.titulo}</p>
                      </div>
                      {hora(dados.horarios[etapa.horario]) && (
                        <span className="flex items-center gap-1 text-xs tabular text-fg-3"><Clock className="h-3 w-3" aria-hidden="true" />{hora(dados.horarios[etapa.horario])}</span>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}

            {dados.comprovanteUrl && (
              <section className="rounded-xl border border-line bg-surface p-5">
                <p className="mb-3 text-sm font-medium text-fg">Comprovante de entrega</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- imagem servida pela rota pública do comprovante */}
                <img src={dados.comprovanteUrl} alt="Foto do comprovante de entrega" className="w-full rounded-lg border border-line" />
              </section>
            )}
          </>
        )}
        <p className="pt-2 text-center text-xs text-fg-3">Tecnologia Entrega Pra Mim</p>
      </main>
    </div>
  )
}
