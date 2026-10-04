import { describe, expect, it } from 'vitest'
import { detectarFormatoImagem, nomeArquivoComprovante, urlComprovante } from '@/lib/comprovante-storage'

const bytes = (...values: (number | string)[]) => new Uint8Array(values.flatMap(v =>
  typeof v === 'string' ? [...v].map(c => c.charCodeAt(0)) : [v]))

describe('comprovante-storage', () => {
  it('detecta formato pelo conteúdo e rejeita o resto', () => {
    expect(detectarFormatoImagem(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpg')
    expect(detectarFormatoImagem(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png')
    expect(detectarFormatoImagem(bytes('RIFF', 0, 0, 0, 0, 'WEBP'))).toBe('webp')
    expect(detectarFormatoImagem(bytes('<html><script>'))).toBeNull()
    expect(detectarFormatoImagem(bytes())).toBeNull()
  })

  it('extrai nome seguro da URL nova e do caminho legado', () => {
    expect(nomeArquivoComprovante(urlComprovante('p1', 'p1-123.jpg'))).toEqual({ fileName: 'p1-123.jpg', legacy: false })
    expect(nomeArquivoComprovante('/uploads/comprovantes/p1-123.png')).toEqual({ fileName: 'p1-123.png', legacy: true })
  })

  it('rejeita traversal e extensões não permitidas', () => {
    expect(nomeArquivoComprovante('/api/pedidos/p1/comprovante/arquivo?f=..%2F..%2F.env')).toBeNull()
    expect(nomeArquivoComprovante('/uploads/comprovantes/../../.env')).toBeNull()
    expect(nomeArquivoComprovante('/uploads/comprovantes/x.html')).toBeNull()
    expect(nomeArquivoComprovante('/api/pedidos/p1/comprovante/arquivo')).toBeNull()
  })
})
