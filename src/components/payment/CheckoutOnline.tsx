'use client'
import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'

export default function CheckoutOnline({ pedidoId }: { pedidoId: string }) {
  const [ativo, setAtivo] = useState(false)
  const [teste, setTeste] = useState(false)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { let atual = true; fetch('/api/organizacao/pagamentos').then(r => r.json()).then(b => { if (atual && b.success) { setAtivo(b.data.ativo); setTeste(b.data.teste) } }).catch(() => {}); return () => { atual = false } }, [])
  if (!ativo) return null
  return <div className="my-4 rounded-xl border border-line bg-surface-2 p-4"><p className="mb-3 text-sm">{teste ? 'Checkout em ambiente de testes — não use um cartão real.' : 'Pague com segurança no checkout da central. As formas disponíveis aparecem na próxima tela.'}</p><Button variant="brand" isLoading={ocupado} onClick={async () => { setOcupado(true); setErro(''); try { const b = await (await fetch('/api/pagamentos/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedidoId }) })).json(); if (!b.success) throw new Error(b.error); const url = new URL(b.data.url); if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Endereço de pagamento inválido'); window.location.assign(url.href) } catch (e) { setErro(e instanceof Error ? e.message : 'Erro de conexão'); setOcupado(false) } }}>Abrir pagamento online</Button>{erro && <p role="alert" className="mt-2 text-sm text-danger">{erro}</p>}</div>
}
