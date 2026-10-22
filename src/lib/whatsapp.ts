// Avisos ao destinatário pelo WhatsApp em um clique (wa.me), sem provedor pago.
// O envio automático depende de provedor contratado (issue #16).

/** Normaliza um telefone brasileiro para o formato do wa.me (55 + DDD + número). */
export function telefoneWhatsApp(telefone: string | null | undefined): string | null {
  if (!telefone) return null
  let digitos = telefone.replace(/\D/g, '')
  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  if (digitos.length === 12 || digitos.length === 13) {
    if (!digitos.startsWith('55')) return null
    digitos = digitos.slice(2)
  }
  if (digitos.startsWith('0')) digitos = digitos.slice(1)
  // DDD de 11 a 99 + fixo (8 dígitos) ou celular (9 dígitos começando com 9)
  if (!/^[1-9][1-9]\d{8}$/.test(digitos) && !/^[1-9][1-9]9\d{8}$/.test(digitos)) return null
  return `55${digitos}`
}

export type AvisoStatus = 'SOLICITADO' | 'ACEITO' | 'EM_COLETA' | 'EM_ENTREGA' | 'ENTREGUE' | 'CANCELADO'

/** Texto do aviso conforme a etapa do pedido. */
export function mensagemAviso(status: AvisoStatus, dados: { central: string; codigo: string; url: string; nome?: string | null }): string {
  const ola = dados.nome?.trim() ? `Olá, ${dados.nome.trim().split(/\s+/)[0]}! ` : 'Olá! '
  const pedido = `pedido ${dados.codigo}`
  switch (status) {
    case 'EM_ENTREGA':
      return `${ola}Seu ${pedido} saiu para entrega com a ${dados.central}. Acompanhe em tempo real: ${dados.url}`
    case 'ENTREGUE':
      return `${ola}Seu ${pedido} foi entregue pela ${dados.central}. O comprovante com foto está aqui: ${dados.url}`
    case 'CANCELADO':
      return `${ola}O ${pedido} da ${dados.central} foi cancelado. Detalhes: ${dados.url}`
    default:
      return `${ola}A ${dados.central} já está cuidando do seu ${pedido}. Acompanhe a entrega: ${dados.url}`
  }
}

/** Link de conversa; sem telefone válido, abre o WhatsApp para escolher o contato. */
export function linkWhatsApp(telefone: string | null | undefined, texto: string): string {
  const numero = telefoneWhatsApp(telefone)
  return `https://wa.me/${numero ?? ''}?text=${encodeURIComponent(texto)}`
}
