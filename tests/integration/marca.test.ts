import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import type { OrgUser } from '@/lib/auth-helpers'
import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { criarOrg, criarUsuario, removerOrg } from './fixtures'

const sessao = vi.hoisted(() => ({ atual: null as unknown }))
vi.mock('next-auth', () => ({ getServerSession: async () => sessao.atual, default: vi.fn() }))
const url = process.env.TEST_DATABASE_URL
if (url && !new URL(url).pathname.endsWith('/entrega_test')) throw new Error('Use o banco descartável entrega_test')

const LOGO_DIR = mkdtempSync(path.join(tmpdir(), 'epm-logos-'))
process.env.LOGO_DIR = LOGO_DIR

function logarComo(user: OrgUser) {
  sessao.atual = { user: { id: user.id, email: user.email, name: 'T', superadmin: false, activeOrganizationId: user.organizationId,
    orgRole: user.orgRole, orgStatus: 'ATIVA', motoboyId: user.motoboyId, clienteId: user.clienteId } }
}
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000000000200015e2e8b5f0000000049454e44ae426082', 'hex')
function upload(conteudo: Buffer, tipo: string) {
  const form = new FormData()
  form.append('logo', new File([new Uint8Array(conteudo)], 'logo', { type: tipo }))
  return new NextRequest('http://localhost/x', { method: 'POST', body: form })
}

;(url ? describe : describe.skip)('MySQL: marca da central', () => {
  let db: PrismaClient
  let orgPropria: { id: string; slug: string }, orgEssencial: { id: string; slug: string }
  let dono: OrgUser, despachante: OrgUser, donoEssencial: OrgUser

  const marcaPut = async (corpo: unknown) => (await import('@/app/api/organizacao/marca/route')).PUT(
    new NextRequest('http://localhost/x', { method: 'PUT', body: JSON.stringify(corpo) }))
  const logoPost = async (req: NextRequest) => (await import('@/app/api/organizacao/marca/logo/route')).POST(req)
  const publica = async (slug: string) => (await import('@/lib/marca')).marcaPublica(slug)

  beforeAll(async () => {
    process.env.DATABASE_URL = url!
    db = (await import('@/lib/prisma')).default
    orgPropria = await criarOrg(db, 'Central Própria')
    orgEssencial = await criarOrg(db, 'Central Essencial')
    await db.organization.update({ where: { id: orgEssencial.id }, data: { plano: 'ESSENCIAL' } })
    dono = await criarUsuario(db, orgPropria.id, 'OWNER')
    despachante = await criarUsuario(db, orgPropria.id, 'DISPATCHER')
    donoEssencial = await criarUsuario(db, orgEssencial.id, 'OWNER')
  })

  afterAll(async () => {
    if (!db) return
    for (const o of [orgPropria, orgEssencial]) if (o) await removerOrg(db, o.id)
    await db.$disconnect()
  })

  it('só o dono de central no plano Marca própria altera nome e cor', async () => {
    logarComo(donoEssencial)
    expect((await marcaPut({ nomeExibicao: 'X', corPrimaria: '#123456' })).status).toBe(403)
    logarComo(despachante)
    expect((await marcaPut({ nomeExibicao: 'X', corPrimaria: '#123456' })).status).toBe(403)
    logarComo(dono)
    expect((await marcaPut({ nomeExibicao: 'X', corPrimaria: 'vermelho' })).status).toBe(400)
    expect((await marcaPut({ nomeExibicao: 'Moto Própria', corPrimaria: '#1A2B3C' })).status).toBe(200)
    expect(await publica(orgPropria.slug)).toMatchObject({ nome: 'Moto Própria', corPrimaria: '#1a2b3c', marcaPropria: true })
  })

  it('logo: aceita imagem real, recusa SVG/texto e arquivo grande; serve pela rota pública', async () => {
    logarComo(dono)
    expect((await logoPost(upload(Buffer.from('<svg onload="alert(1)"></svg>'), 'image/svg+xml'))).status).toBe(400)
    expect((await logoPost(upload(Buffer.alloc(1_100_000, 1), 'image/png'))).status).toBe(400)
    expect((await logoPost(upload(PNG, 'image/png'))).status).toBe(200)
    const settings = await db.organizationSettings.findUniqueOrThrow({ where: { organizationId: orgPropria.id } })
    expect(existsSync(path.join(LOGO_DIR, settings.logoArquivo!))).toBe(true)
    const { GET } = await import('@/app/api/publico/organizacoes/[slug]/logo/route')
    const res = await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ slug: orgPropria.slug }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
  })

  it('fora do plano Marca própria aparece a marca do EPM, mesmo com dados gravados', async () => {
    await db.organizationSettings.update({ where: { organizationId: orgEssencial.id }, data: { nomeExibicao: 'Não deve aparecer', corPrimaria: '#ff0000', logoArquivo: 'x-1.png' } })
    expect(await publica(orgEssencial.slug)).toMatchObject({ nome: 'Central Essencial', corPrimaria: null, logoUrl: null, marcaPropria: false })
    const { GET } = await import('@/app/api/publico/organizacoes/[slug]/logo/route')
    expect((await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ slug: orgEssencial.slug }) })).status).toBe(404)
  })

  it('manifest do PWA por central', async () => {
    const { GET } = await import('@/app/o/[slug]/manifest.webmanifest/route')
    const propria = await (await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ slug: orgPropria.slug }) })).json()
    expect(propria).toMatchObject({ name: 'Moto Própria', theme_color: '#1a2b3c', start_url: `/o/${orgPropria.slug}/login` })
    expect(propria.icons[0].src).toBe(`/api/publico/organizacoes/${orgPropria.slug}/logo`)
    const essencial = await (await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ slug: orgEssencial.slug }) })).json()
    expect(essencial.name).toBe('Central Essencial · Entrega Pra Mim')
    expect(essencial.icons[0].src).toBe('/icons/icon-72x72.png')
  })
})
