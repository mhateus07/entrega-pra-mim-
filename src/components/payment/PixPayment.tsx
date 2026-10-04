'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, CheckCircle2, Clock, Copy, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import { formatarValor } from '@/lib/pagamentos'

interface PixPaymentProps {
  pagamentoId: string
  valorTotal: number
  qrCode: string
  copiaCola: string
  expiraEm: string
  onAprovado: () => void
  onCancelado?: () => void
}

export default function PixPayment({
  pagamentoId,
  valorTotal,
  qrCode,
  copiaCola,
  expiraEm,
  onAprovado,
  onCancelado,
}: PixPaymentProps) {
  const [status, setStatus] = useState<string>('PENDENTE')
  const [tempoRestante, setTempoRestante] = useState<number>(0)
  const [isChecking, setIsChecking] = useState(false)
  const [copied, setCopied] = useState(false)

  // Calcular tempo restante
  useEffect(() => {
    const calcularTempo = () => {
      const expira = new Date(expiraEm).getTime()
      const agora = Date.now()
      const diff = Math.max(0, Math.floor((expira - agora) / 1000))
      setTempoRestante(diff)

      if (diff === 0) {
        setStatus('EXPIRADO')
      }
    }

    calcularTempo()
    const interval = setInterval(calcularTempo, 1000)

    return () => clearInterval(interval)
  }, [expiraEm])

  // Verificar status periodicamente
  const verificarStatus = useCallback(async () => {
    if (status !== 'PENDENTE') return

    setIsChecking(true)

    try {
      const response = await fetch(`/api/pagamentos/${pagamentoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'verificar' }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus(data.data.status)

        if (data.data.status === 'APROVADO') {
          toast.success('Pagamento confirmado')
          onAprovado()
        }
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error)
    } finally {
      setIsChecking(false)
    }
  }, [pagamentoId, status, onAprovado])

  // Polling automático
  useEffect(() => {
    if (status !== 'PENDENTE') return

    const interval = setInterval(verificarStatus, 5000)
    return () => clearInterval(interval)
  }, [status, verificarStatus])

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(copiaCola)
      setCopied(true)
      toast.success('Código copiado')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  const handleCancelar = async () => {
    try {
      const response = await fetch(`/api/pagamentos/${pagamentoId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast('Pagamento cancelado')
        onCancelado?.()
      } else {
        toast.error(data.error || 'Erro ao cancelar')
      }
    } catch {
      toast.error('Erro ao cancelar')
    }
  }

  const formatarTempo = (segundos: number) => {
    const min = Math.floor(segundos / 60)
    const seg = segundos % 60
    return `${min}:${seg.toString().padStart(2, '0')}`
  }

  if (status === 'APROVADO') {
    return (
      <Card className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-fg">Pagamento aprovado</h3>
        <p className="mt-1 text-sm text-fg-2">Seu pagamento foi confirmado.</p>
      </Card>
    )
  }

  if (status === 'EXPIRADO' || tempoRestante === 0) {
    return (
      <Card className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <Clock className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-fg">Código Pix expirado</h3>
        <p className="mb-5 mt-1 text-sm text-fg-2">O prazo para pagamento terminou. Gere um novo código para continuar.</p>
        <Button onClick={onCancelado}>Gerar novo código</Button>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <div>
          <CardTitle>Pague com Pix</CardTitle>
          <p className="mt-0.5 text-[13px] text-fg-3">
            Expira em <span className="font-medium tabular text-fg-2">{formatarTempo(tempoRestante)}</span>
          </p>
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular text-fg">{formatarValor(valorTotal)}</p>
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto rounded-lg border border-line bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR Code em data URL */}
          <img src={qrCode} alt="QR Code Pix" className="h-44 w-44" />
        </div>
        <ol className="space-y-2.5 text-sm text-fg-2">
          {['Abra o app do seu banco', 'Escolha pagar com Pix', 'Escaneie o QR Code ou cole o código', 'Confirme o pagamento'].map((t, i) => (
            <li key={t} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-fg-2">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6">
        <p className="mb-1.5 text-[13px] font-medium text-fg-2">Pix copia e cola</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={copiaCola}
            readOnly
            aria-label="Código Pix copia e cola"
            className="h-10 min-w-0 flex-1 truncate rounded-lg border border-line-strong bg-surface-2 px-3 font-mono text-xs text-fg-2"
          />
          <Button onClick={handleCopiar} variant="outline" className="h-10">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[13px] text-fg-2" aria-live="polite">
        {isChecking ? (
          <><Loader2 className="h-4 w-4 animate-spin text-fg-3" /> Verificando pagamento…</>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
            </span>
            Aguardando pagamento
          </>
        )}
      </div>

      <div className="mt-5 flex gap-2 border-t border-line pt-5">
        <Button variant="outline" onClick={handleCancelar} className="flex-1">Cancelar</Button>
        <Button onClick={verificarStatus} isLoading={isChecking} className="flex-1">Já paguei</Button>
      </div>
    </Card>
  )
}
