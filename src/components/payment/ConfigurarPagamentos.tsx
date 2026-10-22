'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'

export default function ConfigurarPagamentos() {
  const { data: session } = useSession()
  const [dados, setDados] = useState<{ configurado: boolean; conectado: boolean; ativo: boolean; teste: boolean } | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const carregar = useCallback(async () => { try { const b = await (await fetch('/api/organizacao/pagamentos')).json(); if (!b.success) throw new Error(b.error); setDados(b.data); setErro('') } catch { setErro('Não foi possível verificar a conexão de pagamentos') } }, [])
  useEffect(() => { void carregar() }, [carregar])
  // Sem provedor configurado na plataforma, a seção não aparece para a central
  if (session?.user?.orgRole !== 'OWNER' || !dados?.configurado) return null
  return <section className="my-5 rounded-2xl border border-line bg-surface p-5"><h2 className="text-lg font-semibold">Recebimentos online</h2><p className="mt-2 text-sm text-fg-2">{dados?.ativo ? 'Conta habilitada para checkout.' : dados?.conectado ? 'Complete os dados da central para habilitar os recebimentos.' : 'Conecte a conta da sua central. O pagamento será processado diretamente para ela.'} {dados?.teste ? 'Ambiente de testes.' : ''}</p><div className="mt-4 flex flex-wrap gap-2"><Button isLoading={ocupado} onClick={async () => { setOcupado(true); try { const b = await (await fetch('/api/organizacao/pagamentos', { method: 'POST' })).json(); if (!b.success) throw new Error(b.error); const url = new URL(b.data.url); if (url.protocol !== 'https:' || !(url.hostname === 'stripe.com' || url.hostname.endsWith('.stripe.com'))) throw new Error('Endereço inválido'); window.location.assign(url.href) } catch (e) { setErro(e instanceof Error ? e.message : 'Erro de conexão'); setOcupado(false) } }}>Conectar ou atualizar cadastro</Button><Button variant="outline" onClick={carregar}>Verificar situação</Button><a className="inline-flex items-center text-sm underline" href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">Painel de pagamentos e disputas</a></div>{erro && <p role="alert" className="mt-3 text-sm text-danger">{erro}</p>}</section>
}
