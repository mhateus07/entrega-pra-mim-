import { describe, expect, it } from 'vitest'
import { linkWhatsApp, mensagemAviso, telefoneWhatsApp } from '@/lib/whatsapp'

describe('aviso ao destinatário pelo WhatsApp', () => {
  it('normaliza telefones brasileiros', () => {
    expect(telefoneWhatsApp('(32) 99999-1234')).toBe('5532999991234')
    expect(telefoneWhatsApp('+55 32 99999-1234')).toBe('5532999991234')
    expect(telefoneWhatsApp('032 3215-1234')).toBe('553232151234')
    expect(telefoneWhatsApp('0055 11 98888 7777')).toBe('5511988887777')
  })

  it('recusa números incompletos ou de outro país', () => {
    expect(telefoneWhatsApp('')).toBeNull()
    expect(telefoneWhatsApp(null)).toBeNull()
    expect(telefoneWhatsApp('99999-1234')).toBeNull()
    expect(telefoneWhatsApp('+1 415 555 2671')).toBeNull()
    expect(telefoneWhatsApp('(32) 89999-1234')).toBeNull()
  })

  it('monta a mensagem de cada etapa com o link', () => {
    const dados = { central: 'Moto JF', codigo: '#ABC123', url: 'https://x/r/t', nome: 'Ana Souza' }
    expect(mensagemAviso('EM_ENTREGA', dados)).toBe('Olá, Ana! Seu pedido #ABC123 saiu para entrega com a Moto JF. Acompanhe em tempo real: https://x/r/t')
    expect(mensagemAviso('ENTREGUE', { ...dados, nome: null })).toMatch(/^Olá! .*entregue.*https:\/\/x\/r\/t$/)
  })

  it('sem telefone válido abre o WhatsApp para escolher o contato', () => {
    expect(linkWhatsApp('abc', 'oi')).toBe('https://wa.me/?text=oi')
    expect(linkWhatsApp('32999991234', 'a b')).toBe('https://wa.me/5532999991234?text=a%20b')
  })
})
