'use client'

import { useEffect, useState } from 'react'
import { PackageX } from 'lucide-react'
import TrackingMap from '@/components/maps/TrackingMap'
import { LogoMark } from '@/components/brand/Logo'
import { cn } from '@/utils/cn'

type Status = 'SOLICITADO' | 'ACEITO' | 'EM_COLETA' | 'EM_ENTREGA' | 'ENTREGUE' | 'CANCELADO'

interface Rastreio {
  codigo: string
  status: Status
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

const TITULO: Record<Status, string> = {
  SOLICITADO: 'Procurando um motoboy',
  ACEITO: 'Motoboy a caminho da coleta',
  EM_COLETA: 'Coletando o seu pedido',
  EM_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Entrega cancelada',
}

const ETAPAS = [
  { status: 'ACEITO', titulo: 'Pedido aceito', horario: 'aceito' },
  { status: 'EM_COLETA', titulo: 'Na coleta', horario: 'aceito' },
  { status: 'EM_ENTREGA', titulo: 'Saiu para entrega', horario: 'coletado' },
  { status: 'ENTREGUE', titulo: 'Entregue, com foto', horario: 'entregue' },
] as const
const ORDEM: Status[] = ['SOLICITADO', 'ACEITO', 'EM_COLETA', 'EM_ENTREGA', 'ENTREGUE']

const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null)

// Mapa desenhado (quarteirões e a rota da marca) quando não há posição ao vivo:
// mostra em que ponto do caminho a entrega está.
function MapaDaRota({ status }: { status: Status }) {
  const ROTA = 'M52 196 V146 H170 V86 L214 42 H300'
  const progresso = { SOLICITADO: 0, ACEITO: 0.12, EM_COLETA: 0.3, EM_ENTREGA: 0.6, ENTREGUE: 1, CANCELADO: 0 }[status]
  const entregue = status === 'ENTREGUE'
  return (
    <svg viewBox="0 0 340 220" className="block w-full bg-[#f1f0eb] dark:bg-surface-2" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4, 5].map((c) => (
        <rect key={`${r}${c}`} x={c * 60 + 8} y={r * 46 + 6} width="48" height="34" rx="3" className="fill-[#e9e8e3] dark:fill-surface-3" />
      )))}
      <path d={ROTA} fill="none" stroke="var(--cor-suave)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={ROTA} pathLength={1} fill="none" stroke="var(--cor)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="1" strokeDashoffset={1 - progresso} style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.2,0.8,0.2,1)' }} />
      <circle cx="52" cy="196" r="10" fill="#fff" stroke="var(--cor)" strokeWidth="5" />
      <circle cx="300" cy="42" r="12" fill={entregue ? 'var(--cor)' : '#141413'} />
      {entregue && <path d="M294 42 l4.5 4.5 l8 -9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="carimbo-check" />}
    </svg>
  )
}

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

  // Marca própria troca a cor da rota e dos marcadores; nos outros planos é o laranja do EPM
  const marcaPropria = !!dados?.central.corPrimaria || !!dados?.central.logoUrl
  const cor = dados?.central.corPrimaria ?? '#e2570f'
  const estilo = { '--cor': cor, '--cor-suave': `color-mix(in srgb, ${cor} 32%, transparent)`, '--brand': cor } as React.CSSProperties
  const indice = dados ? ORDEM.indexOf(dados.status) : -1
  const aoVivo = dados?.status === 'EM_ENTREGA' && dados.posicao && dados.destino.latitude != null

  return (
    <div className="min-h-screen bg-page sm:py-8" style={estilo}>
      <div className="mx-auto min-h-screen max-w-md overflow-hidden bg-surface sm:min-h-0 sm:rounded-[28px] sm:border sm:border-line sm:shadow-pop">
        <header className="flex items-center gap-2.5 px-5 pb-4 pt-6">
          {marcaPropria ? (
            dados?.central.logoUrl
              // eslint-disable-next-line @next/next/no-img-element -- logo servido pela rota pública da central
              ? <img src={dados.central.logoUrl} alt="" className="h-8 max-w-[120px] object-contain" />
              : <span className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[12px] font-bold text-white" style={{ background: cor }}>
                {dados?.central.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
              </span>
          ) : <LogoMark variant="icone" className="h-8 w-8" />}
          <p className="truncate text-[16px] font-bold text-fg">{marcaPropria ? dados?.central.nome : 'Entrega Pra Mim'}</p>
        </header>

        {erro && !dados && (
          <div className="px-5 py-16 text-center">
            <PackageX className="mx-auto h-8 w-8 text-fg-3" aria-hidden="true" />
            <p className="mt-3 text-sm text-fg-2">{erro}</p>
          </div>
        )}
        {!dados && !erro && <div className="skeleton mx-5 h-56" />}

        {dados && (
          <>
            {aoVivo ? (
              <TrackingMap
                className="h-60"
                origem={null}
                destino={{ lat: dados.destino.latitude!, lng: dados.destino.longitude!, label: 'Destino' }}
                motoboyLocation={{ lat: dados.posicao!.latitude, lng: dados.posicao!.longitude, label: dados.motoboy?.nome }}
              />
            ) : dados.status !== 'CANCELADO' && <MapaDaRota status={dados.status} />}

            <section className="px-5 pb-6 pt-5">
              <p className="rotulo text-fg-3">Pedido {dados.codigo}</p>
              <h1 key={dados.status} className="titulo-display status-troca mt-1.5 text-[34px] text-fg">{TITULO[dados.status]}</h1>
              <p className="mt-1.5 text-[15px] text-fg-2">
                {dados.status === 'ENTREGUE'
                  ? <>Entregue às <b className="font-mono font-medium text-fg">{hora(dados.horarios.entregue)}</b> · {dados.destino.bairro}</>
                  : dados.status === 'CANCELADO'
                    ? <>Fale com a central para mais informações.</>
                    : <>{dados.etaMinutos != null ? <>Chega em <b className="text-fg">~{dados.etaMinutos} min</b> · </> : null}{dados.destino.bairro}, {dados.destino.cidade}</>}
              </p>
              {dados.etaMinutos != null && dados.status !== 'ENTREGUE' && (
                <p className="mt-1 text-xs text-fg-3">Previsão aproximada · atualizada às <span className="font-mono">{hora(dados.posicao?.atualizadoEm ?? dados.atualizadoEm)}</span></p>
              )}
              {dados.motoboy && dados.status !== 'CANCELADO' && (
                <p className="mt-3 text-sm text-fg-2">Entregador: <span className="font-semibold text-fg">{dados.motoboy.nome}</span></p>
              )}

              {dados.status !== 'CANCELADO' && (
                <ol className="relative mt-6 space-y-3.5">
                  <span aria-hidden="true" className="absolute bottom-2 left-[4px] top-2 w-[2px] bg-line" />
                  {ETAPAS.map((etapa) => {
                    const feito = indice >= ORDEM.indexOf(etapa.status)
                    const h = feito ? hora(dados.horarios[etapa.horario]) : null
                    return (
                      <li key={etapa.status} className="relative flex items-center justify-between pl-6 text-[14px]">
                        <span
                          aria-hidden="true"
                          className={cn('absolute left-0 top-1/2 h-[10px] w-[10px] -translate-y-1/2 rounded-full border-2 transition-colors duration-500', !feito && 'border-line-strong bg-surface')}
                          style={feito ? { background: cor, borderColor: cor } : undefined}
                        />
                        <span className={feito ? 'text-fg' : 'text-fg-3'}>{etapa.titulo}</span>
                        <span className="font-mono text-[13px] text-fg-3">{h ?? '--:--'}</span>
                      </li>
                    )
                  })}
                </ol>
              )}

              {dados.comprovanteUrl && (
                <figure className="mt-6">
                  <p className="rotulo mb-2 text-fg-3">Comprovante de entrega</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagem servida pela rota pública do comprovante */}
                  <img src={dados.comprovanteUrl} alt="Foto do comprovante de entrega" className="w-full rounded-[10px] border border-line" />
                </figure>
              )}
            </section>
          </>
        )}

        <footer className="border-t border-line px-5 py-4 text-[12px] text-fg-3">
          {marcaPropria
            ? <>tecnologia <b className="ml-1 text-fg">Entrega Pra Mim</b></>
            : <>Entrega feita por <b className="ml-1 text-fg">{dados?.central.nome ?? '…'}</b></>}
        </footer>
      </div>
    </div>
  )
}
