'use client'

import { useState } from 'react'
import { Link2, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'

// Link público para o destinatário acompanhar a entrega sem criar conta
export default function CompartilharRastreio({ pedidoId }: { pedidoId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const gerar = async () => {
    setCarregando(true)
    try {
      const body = await (await fetch(`/api/pedidos/${pedidoId}/rastreio-publico`, { method: 'POST' })).json()
      if (!body.success) throw new Error(body.error)
      setUrl(body.data.url)
      await navigator.clipboard?.writeText(body.data.url).then(() => toast.success('Link copiado')).catch(() => {})
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar o link')
    } finally {
      setCarregando(false)
    }
  }

  if (!url) {
    return (
      <Button variant="outline" size="sm" onClick={gerar} isLoading={carregando}>
        <Link2 className="h-3.5 w-3.5" /> Link de rastreio
      </Button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success('Link copiado'))}>
        <Link2 className="h-3.5 w-3.5" /> Copiar link
      </Button>
      <a className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-[13px] font-medium text-white"
        href={`https://wa.me/?text=${encodeURIComponent(`Acompanhe sua entrega: ${url}`)}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-3.5 w-3.5" /> Enviar no WhatsApp
      </a>
    </div>
  )
}
