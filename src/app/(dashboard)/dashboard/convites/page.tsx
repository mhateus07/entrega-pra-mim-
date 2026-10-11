'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Copy, MessageCircle, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState, PageHeader } from '@/components/ui/Feedback'
import { TableCard, Table, THead, TBody, TH, TD } from '@/components/ui/Table'

type Papel = 'CLIENT' | 'DRIVER' | 'DISPATCHER'
interface Convite { id: string; papel: Papel; email: string | null; nome: string | null; expiresAt: string; situacao: 'PENDENTE' | 'USADO' | 'EXPIRADO' }

const PAPEL: Record<Papel, string> = { CLIENT: 'Empresa cliente', DRIVER: 'Entregador', DISPATCHER: 'Despachante' }
const SITUACAO = { PENDENTE: 'warning', USADO: 'success', EXPIRADO: 'default' } as const

export default function ConvitesPage() {
  const { data: session } = useSession()
  const [convites, setConvites] = useState<Convite[]>([])
  const [papel, setPapel] = useState<Papel>('DRIVER')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [gerando, setGerando] = useState(false)
  const [link, setLink] = useState<{ url: string; papel: Papel } | null>(null)

  const carregar = useCallback(() => {
    fetch('/api/convites').then((r) => r.json()).then((b) => { if (b.success) setConvites(b.data) }).catch(() => {})
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const gerar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGerando(true)
    try {
      const response = await fetch('/api/convites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papel, nome: nome || undefined, email: email || undefined }),
      })
      const body = await response.json()
      if (!body.success) throw new Error(body.error)
      setLink({ url: body.data.url, papel })
      setNome('')
      setEmail('')
      carregar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar convite')
    } finally {
      setGerando(false)
    }
  }

  const revogar = async (id: string) => {
    const body = await (await fetch(`/api/convites/${id}`, { method: 'DELETE' })).json()
    if (body.success) { toast.success('Convite revogado'); carregar() } else toast.error(body.error)
  }

  const mensagem = link && `Olá! Use este link para se cadastrar na nossa central (${PAPEL[link.papel].toLowerCase()}): ${link.url}`

  return (
    <>
      <PageHeader title="Convites" description="Motoboys, empresas clientes e despachantes entram na central por um link de convite. Cada link vale uma vez." />

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="h-fit">
          <CardTitle>Novo convite</CardTitle>
          <form className="mt-4 space-y-3" onSubmit={gerar}>
            <Select label="Para quem" value={papel} onChange={(e) => setPapel(e.target.value as Papel)}
              options={(['DRIVER', 'CLIENT', ...(session?.user?.orgRole === 'OWNER' ? ['DISPATCHER'] : [])] as Papel[]).map((p) => ({ value: p, label: PAPEL[p] }))} />
            <Input label="Nome (opcional)" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Input label="E-mail (opcional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              helperText="Se informar, só esse e-mail consegue usar o link." />
            <Button type="submit" className="w-full" isLoading={gerando}><Send className="h-4 w-4" /> Gerar link</Button>
          </form>

          {link && mensagem && (
            <div className="mt-4 space-y-2 rounded-lg border border-line bg-surface-2 p-3">
              <p className="break-all text-xs text-fg-2">{link.url}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(link.url).then(() => toast.success('Link copiado'))}>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
                <a className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-[13px] font-medium text-white"
                  href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              </div>
              <p className="text-xs text-fg-3">Guarde agora: por segurança, o link não aparece de novo.</p>
            </div>
          )}
        </Card>

        <TableCard>
          {convites.length === 0 ? (
            <EmptyState icon={Send} title="Nenhum convite ainda" description="Gere um link e envie pelo WhatsApp." />
          ) : (
            <Table className="min-w-[560px]">
              <THead><tr><TH>Para</TH><TH>Papel</TH><TH>Validade</TH><TH>Situação</TH><TH /></tr></THead>
              <TBody>
                {convites.map((c) => (
                  <tr key={c.id}>
                    <TD><p className="text-fg">{c.nome || '—'}</p><p className="text-xs text-fg-3">{c.email}</p></TD>
                    <TD>{PAPEL[c.papel]}</TD>
                    <TD className="tabular text-fg-2">{new Date(c.expiresAt).toLocaleDateString('pt-BR')}</TD>
                    <TD><Badge variant={SITUACAO[c.situacao]}>{c.situacao === 'PENDENTE' ? 'Aguardando' : c.situacao === 'USADO' ? 'Usado' : 'Expirado'}</Badge></TD>
                    <TD className="text-right">
                      {c.situacao === 'PENDENTE' && (
                        <Button size="sm" variant="ghost" onClick={() => revogar(c.id)}><X className="h-3.5 w-3.5" /> Revogar</Button>
                      )}
                    </TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </TableCard>
      </div>
    </>
  )
}
