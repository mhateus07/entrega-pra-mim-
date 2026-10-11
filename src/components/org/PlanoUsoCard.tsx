'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Gauge } from 'lucide-react'
import { Alert } from '@/components/ui/Feedback'
import { formatarMoeda } from '@/lib/pricing'
import { cn } from '@/utils/cn'

interface Uso {
  mes: string
  limites: { nome: string; motoboys: number; entregasMes: number }
  entregas: { limite: number; usadas: number; excedentes: number; valorExcedente: number; bloqueado: boolean }
  chamadasMaps: number
  motoboys: { ativos: number; limite: number }
}

function Barra({ valor, limite }: { valor: number; limite: number }) {
  const pct = Math.min(100, Math.round((valor / Math.max(1, limite)) * 100))
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
      <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success')} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Plano contratado e consumo do mês, com aviso ao passar do limite de entregas
export default function PlanoUsoCard() {
  const [uso, setUso] = useState<Uso | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/organizacao/uso', { signal: controller.signal })
      .then((r) => r.json())
      .then((body) => { if (body.success) setUso(body.data) })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  if (!uso) return null
  const { entregas, motoboys } = uso

  return (
    <div className="space-y-3">
      {entregas.excedentes > 0 && (
        <Alert variant={entregas.bloqueado ? 'danger' : 'warning'} icon={AlertTriangle}
          title={entregas.bloqueado ? 'Limite de entregas do plano esgotado' : 'Sua central passou do limite de entregas do plano'}>
          {entregas.bloqueado
            ? 'Novos pedidos estão bloqueados até o próximo mês ou até a mudança de plano.'
            : `${entregas.excedentes} entrega${entregas.excedentes > 1 ? 's' : ''} excedente${entregas.excedentes > 1 ? 's' : ''} este mês (${formatarMoeda(entregas.valorExcedente)} a R$ 0,10 cada). Novos pedidos são bloqueados acima de 120% do limite.`}
        </Alert>
      )}
      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs sm:grid-cols-3">
        <div className="flex items-start gap-2.5">
          <Gauge className="mt-0.5 h-4 w-4 text-fg-3" aria-hidden="true" />
          <div>
            <p className="text-[13px] text-fg-3">Plano</p>
            <p className="text-sm font-semibold text-fg">{uso.limites.nome}</p>
            <p className="text-xs text-fg-3">Consumo de {uso.mes.split('-').reverse().join('/')}</p>
          </div>
        </div>
        <div>
          <p className="text-[13px] text-fg-3">Entregas no mês</p>
          <p className="text-sm font-semibold tabular text-fg">{entregas.usadas} <span className="font-normal text-fg-3">de {entregas.limite}</span></p>
          <Barra valor={entregas.usadas} limite={entregas.limite} />
        </div>
        <div>
          <p className="text-[13px] text-fg-3">Motoboys ativos</p>
          <p className="text-sm font-semibold tabular text-fg">{motoboys.ativos} <span className="font-normal text-fg-3">de {motoboys.limite}</span></p>
          <Barra valor={motoboys.ativos} limite={motoboys.limite} />
        </div>
      </div>
    </div>
  )
}
