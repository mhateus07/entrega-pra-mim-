import { NextRequest } from 'next/server'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { jsonResponse } from '@/lib/json-response'
import prisma from '@/lib/prisma'
import { applyRateLimit, requireOwner, badRequest, forbidden, serverError } from '@/lib/auth-helpers'
import { detectarFormatoImagem } from '@/lib/comprovante-storage'
import { LOGO_DIR, LOGO_MAX_BYTES, marcaPermitida, nomeArquivoLogoSeguro } from '@/lib/marca'
import { registrarAuditoria } from '@/lib/audit'

async function exigirMarcaPropria(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId }, select: { plano: true, settings: { select: { logoArquivo: true } } },
  })
  return { permitido: marcaPermitida(org.plano), atual: nomeArquivoLogoSeguro(org.settings?.logoArquivo) }
}

// POST /api/organizacao/marca/logo - Envia o logo (campo "logo"; JPG, PNG ou WebP até 1 MB)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireOwner()
    if (!auth.authenticated) return auth.response
    const rateLimit = await applyRateLimit(request, 'upload', auth.user.id)
    if (!rateLimit.success) return rateLimit.response
    if (Number(request.headers.get('content-length') ?? 0) > LOGO_MAX_BYTES + 64 * 1024) {
      return jsonResponse({ success: false, error: 'Logo muito grande. Máximo 1 MB.' }, { status: 413 })
    }
    const organizationId = auth.user.organizationId
    const { permitido, atual } = await exigirMarcaPropria(organizationId)
    if (!permitido) return forbidden('Marca própria está disponível no plano Marca própria')

    const arquivo = (await request.formData()).get('logo')
    if (!(arquivo instanceof File)) return badRequest('Nenhum arquivo enviado')
    if (arquivo.size > LOGO_MAX_BYTES) return badRequest('Logo muito grande. Máximo 1 MB.')
    const buffer = Buffer.from(await arquivo.arrayBuffer())
    const ext = detectarFormatoImagem(buffer)
    if (!ext) return badRequest('Use uma imagem JPG, PNG ou WebP')

    await mkdir(LOGO_DIR, { recursive: true })
    const nome = `${organizationId}-${Date.now()}.${ext}`
    await writeFile(path.join(LOGO_DIR, nome), buffer)
    await prisma.organizationSettings.upsert({ where: { organizationId }, create: { organizationId, logoArquivo: nome }, update: { logoArquivo: nome } })
    if (atual) await unlink(path.join(LOGO_DIR, atual)).catch(() => {})

    await registrarAuditoria({ acao: 'marca.alterada', entidade: 'Organization', entidadeId: organizationId, userId: auth.user.id, organizationId, request, dados: { logo: nome } })
    return jsonResponse({ success: true, message: 'Logo atualizado' })
  } catch (error) {
    console.error('Erro ao enviar logo:', error)
    return serverError('Erro ao enviar logo')
  }
}

// DELETE /api/organizacao/marca/logo - Remove o logo
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireOwner()
    if (!auth.authenticated) return auth.response
    const organizationId = auth.user.organizationId
    const { atual } = await exigirMarcaPropria(organizationId)
    await prisma.organizationSettings.updateMany({ where: { organizationId }, data: { logoArquivo: null } })
    if (atual) await unlink(path.join(LOGO_DIR, atual)).catch(() => {})
    await registrarAuditoria({ acao: 'marca.alterada', entidade: 'Organization', entidadeId: organizationId, userId: auth.user.id, organizationId, request, dados: { logo: null } })
    return jsonResponse({ success: true, message: 'Logo removido' })
  } catch (error) {
    console.error('Erro ao remover logo:', error)
    return serverError()
  }
}
