'use client'

import { useState } from 'react'
import { Link2, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { codigoPedido } from '@/utils/helpers'
import { linkWhatsApp, mensagemAviso, telefoneWhatsApp, type AvisoStatus } from '@/lib/whatsapp'

interface Props {
  pedidoId: string
  status?: AvisoStatus
  destinatarioNome?: string | null
  destinatarioTelefone?: string | null
}

const ROTULO_AVISO: Partial<Record<AvisoStatus, string>> = {
  EM_ENTREGA: 'Avisar: saiu para entrega',
  ENTREGUE: 'Avisar: entregue',
}

// Link público para o destinatário acompanhar a entrega sem criar conta
export default function CompartilharRastreio({ pedidoId, status = 'SOLICITADO', destinatarioNome, destinatarioTelefone }: Props) {
  const [link, setLink] = useState<{ url: string; central: string } | null>(null)
  const [carregando, setCarregando] = useState(false)
  const telefone = telefoneWhatsApp(destinatarioTelefone)

  const obter = async () => {
    if (link) return link
    const body = await (await fetch(`/api/pedidos/${pedidoId}/rastreio-publico`, { method: 'POST' })).json()
    if (!body.success) throw new Error(body.error)
    const dados = { url: body.data.url as string, central: (body.data.central as string) || 'central' }
    setLink(dados)
    return dados
  }

  const gerar = async () => {
    setCarregando(true)
    try {
      const { url } = await obter()
      await navigator.clipboard?.writeText(url).then(() => toast.success('Link copiado')).catch(() => {})
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar o link')
    } finally {
      setCarregando(false)
    }
  }

  // Abre a janela antes do fetch: navegadores bloqueiam pop-up aberto depois de uma espera
  const avisar = async () => {
    // Sem 'noopener' no open (ele faria retornar null); o vínculo é cortado logo em seguida
    const janela = window.open('', '_blank')
    if (janela) janela.opener = null
    setCarregando(true)
    try {
      const { url, central } = await obter()
      const texto = mensagemAviso(status, { central, codigo: codigoPedido(pedidoId), url, nome: destinatarioNome })
      const destino = linkWhatsApp(telefone, texto)
      if (janela) janela.location.href = destino
      else window.location.assign(destino)
    } catch (error) {
      janela?.close()
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar o link')
    } finally {
      setCarregando(false)
    }
  }

  const botaoAviso = (
    <button type="button" onClick={avisar} disabled={carregando}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-[13px] font-medium text-white disabled:opacity-60">
      <MessageCircle className="h-3.5 w-3.5" />
      {telefone ? (ROTULO_AVISO[status] ?? 'Avisar destinatário') : 'Enviar no WhatsApp'}
    </button>
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={gerar} isLoading={carregando && !link}>
        <Link2 className="h-3.5 w-3.5" /> {link ? 'Copiar link' : 'Link de rastreio'}
      </Button>
      {(link || telefone) && botaoAviso}
    </div>
  )
}
