'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Copy, ImageUp, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardTitle } from '@/components/ui/Card'
import { Alert, PageHeader, PageLoader } from '@/components/ui/Feedback'

interface Marca {
  disponivel: boolean
  slug: string
  nomeExibicao: string | null
  corPrimaria: string | null
  temLogo: boolean
  publica: { nome: string; logoUrl: string | null; corPrimaria: string | null } | null
}

export default function MarcaPage() {
  const { data: session } = useSession()
  const dono = session?.user?.orgRole === 'OWNER'
  const [marca, setMarca] = useState<Marca | null>(null)
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#f0712b')
  const [salvando, setSalvando] = useState(false)
  const [versaoLogo, setVersaoLogo] = useState(0)
  const arquivo = useRef<HTMLInputElement>(null)

  const carregar = useCallback(() => {
    fetch('/api/organizacao/marca').then((r) => r.json()).then((b) => {
      if (!b.success) return
      setMarca(b.data)
      setNome(b.data.nomeExibicao ?? '')
      if (b.data.corPrimaria) setCor(b.data.corPrimaria)
    }).catch(() => {})
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const salvar = async () => {
    setSalvando(true)
    const body = await (await fetch('/api/organizacao/marca', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomeExibicao: nome || null, corPrimaria: cor }),
    })).json()
    setSalvando(false)
    if (body.success) { toast.success('Marca salva'); setMarca(body.data) } else toast.error(body.error)
  }

  const enviarLogo = async (file: File) => {
    const form = new FormData()
    form.append('logo', file)
    const body = await (await fetch('/api/organizacao/marca/logo', { method: 'POST', body: form })).json()
    if (body.success) { toast.success('Logo atualizado'); setVersaoLogo((v) => v + 1); carregar() } else toast.error(body.error)
  }

  const removerLogo = async () => {
    const body = await (await fetch('/api/organizacao/marca/logo', { method: 'DELETE' })).json()
    if (body.success) { toast.success('Logo removido'); carregar() } else toast.error(body.error)
  }

  if (!marca) return <PageLoader />
  const linkLogin = typeof window !== 'undefined' ? `${window.location.origin}/o/${marca.slug}/login` : `/o/${marca.slug}/login`

  return (
    <>
      <PageHeader title="Marca da central" description="Logo, nome e cor que aparecem no link de rastreio, no login da central e no app instalado no celular." />

      <Card className="mb-4">
        <CardTitle>Link de acesso da central</CardTitle>
        <p className="mt-1 text-[13px] text-fg-3">Envie para motoboys e empresas clientes entrarem já na sua central. No celular, dá para instalar como app pela tela inicial.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-surface-2 px-2 py-1 text-xs text-fg-2">{linkLogin}</code>
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(linkLogin).then(() => toast.success('Link copiado'))}>
            <Copy className="h-3.5 w-3.5" /> Copiar
          </Button>
        </div>
      </Card>

      {!marca.disponivel ? (
        <Alert variant="info" title="Disponível no plano Marca própria">
          Com a marca própria, o cliente final vê o logo, o nome e a cor da sua central, e não os do Entrega Pra Mim. Fale com a nossa equipe para mudar de plano.
        </Alert>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardTitle>Identidade</CardTitle>
            {!dono && <Alert variant="info" className="mt-3">Somente o dono da central altera a marca.</Alert>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input label="Nome de exibição" value={nome} maxLength={60} disabled={!dono}
                onChange={(e) => setNome(e.target.value)} placeholder={marca.publica?.nome} helperText="Como o cliente final vê o nome da central." />
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-fg-2" htmlFor="cor">Cor principal</label>
                <div className="flex items-center gap-2">
                  <input id="cor" type="color" value={cor} disabled={!dono} onChange={(e) => setCor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-line bg-surface" />
                  <code className="text-xs text-fg-3">{cor}</code>
                </div>
              </div>
            </div>
            {dono && <Button className="mt-4" onClick={salvar} isLoading={salvando}><Save className="h-4 w-4" /> Salvar</Button>}

            <div className="mt-6 border-t border-line pt-4">
              <p className="text-[13px] font-medium text-fg-2">Logo</p>
              <p className="text-xs text-fg-3">JPG, PNG ou WebP até 1 MB, de preferência com fundo transparente.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {marca.publica?.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- logo servido pela rota pública da central
                  <img src={`${marca.publica.logoUrl}?v=${versaoLogo}`} alt="Logo atual" className="h-12 max-w-[160px] rounded border border-line bg-surface-2 object-contain p-1" />
                )}
                {dono && (
                  <>
                    <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviarLogo(f); e.target.value = '' }} />
                    <Button size="sm" variant="outline" onClick={() => arquivo.current?.click()}><ImageUp className="h-3.5 w-3.5" /> Enviar logo</Button>
                    {marca.temLogo && <Button size="sm" variant="ghost" onClick={removerLogo}><Trash2 className="h-3.5 w-3.5" /> Remover</Button>}
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card className="h-fit" style={{ '--brand': cor } as React.CSSProperties}>
            <CardTitle>Prévia do rastreio</CardTitle>
            <div className="mt-4 rounded-lg border border-line p-4">
              <div className="flex items-center gap-2">
                {marca.publica?.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element -- prévia do logo da central
                  ? <img src={`${marca.publica.logoUrl}?v=${versaoLogo}`} alt="" className="h-7 max-w-[100px] object-contain" />
                  : null}
                <span className="text-sm font-semibold text-fg">{nome || marca.publica?.nome}</span>
              </div>
              <p className="mt-3 text-xs text-fg-3">Previsão</p>
              <p className="text-lg font-semibold text-fg">cerca de 12 min</p>
              <div className="mt-3 h-1.5 rounded-full bg-[var(--brand)]" />
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
