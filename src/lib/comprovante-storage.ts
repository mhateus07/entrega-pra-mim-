import path from 'path'

// Comprovantes ficam fora de public/ e só são servidos pela rota autenticada
// /api/pedidos/[id]/comprovante/arquivo. Arquivos antigos em public/uploads
// continuam legíveis pela mesma rota até serem migrados.
export const COMPROVANTE_DIR = process.env.COMPROVANTE_DIR ||
  path.join(process.cwd(), 'storage', 'comprovantes')
export const COMPROVANTE_LEGACY_DIR = path.join(process.cwd(), 'public', 'uploads', 'comprovantes')

export const COMPROVANTE_MIME = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const

export type ComprovanteExt = keyof typeof COMPROVANTE_MIME

const NOME_ARQUIVO = /^[A-Za-z0-9_-]+\.(jpg|png|webp)$/

// Identifica o formato pelo conteúdo (magic bytes), nunca pelo nome ou MIME
// informados pelo cliente.
export function detectarFormatoImagem(bytes: Uint8Array): ComprovanteExt | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return 'png'
  if (bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'webp'
  return null
}

export function urlComprovante(pedidoId: string, fileName: string): string {
  return `/api/pedidos/${pedidoId}/comprovante/arquivo?f=${encodeURIComponent(fileName)}`
}

// Extrai o nome do arquivo do valor salvo no banco (URL nova ou caminho legado).
// Retorna null para qualquer valor que não seja um nome de arquivo seguro.
export function nomeArquivoComprovante(fotoComprovante: string): { fileName: string; legacy: boolean } | null {
  let fileName: string | null
  let legacy = false
  if (fotoComprovante.startsWith('/uploads/comprovantes/')) {
    fileName = fotoComprovante.slice('/uploads/comprovantes/'.length)
    legacy = true
  } else {
    fileName = new URL(fotoComprovante, 'http://local').searchParams.get('f')
  }
  if (!fileName || !NOME_ARQUIVO.test(fileName)) return null
  return { fileName, legacy }
}
