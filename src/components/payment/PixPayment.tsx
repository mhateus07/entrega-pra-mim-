'use client'

import { useState, useEffect, useCallback } from 'react'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
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
          toast.success('Pagamento confirmado!')
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
      toast.success('Código copiado!')
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
      <Card variant="bordered" className="border-green-500">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-green-600 mb-2">
            Pagamento Aprovado!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Seu pagamento foi confirmado com sucesso.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (status === 'EXPIRADO' || tempoRestante === 0) {
    return (
      <Card variant="bordered" className="border-red-500">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-red-600 mb-2">PIX Expirado</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            O tempo para pagamento expirou. Por favor, gere um novo PIX.
          </p>
          <Button onClick={onCancelado}>Tentar Novamente</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pague com PIX</span>
          <span className="text-sm font-normal text-gray-500">
            Expira em {formatarTempo(tempoRestante)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Valor */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Valor</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatarValor(valorTotal)}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-lg shadow-inner">
            <img
              src={qrCode}
              alt="QR Code PIX"
              className="w-48 h-48"
            />
          </div>
        </div>

        {/* Instruções */}
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p className="font-medium text-gray-900 dark:text-white">Como pagar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Abra o app do seu banco</li>
            <li>Escolha pagar com PIX</li>
            <li>Escaneie o QR Code ou cole o código</li>
            <li>Confirme o pagamento</li>
          </ol>
        </div>

        {/* Copia e Cola */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ou copie o código PIX:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={copiaCola}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm truncate"
            />
            <Button onClick={handleCopiar} variant={copied ? 'primary' : 'outline'}>
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 text-sm">
          {isChecking ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 dark:text-gray-400">Verificando pagamento...</span>
            </>
          ) : (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
              <span className="text-gray-600 dark:text-gray-400">Aguardando pagamento</span>
            </>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancelar} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={verificarStatus} isLoading={isChecking} className="flex-1">
            Já Paguei
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
