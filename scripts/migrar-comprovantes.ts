import { copyFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import prisma from '../src/lib/prisma'
import {
  COMPROVANTE_DIR,
  COMPROVANTE_LEGACY_DIR,
  nomeArquivoComprovante,
  urlComprovante,
} from '../src/lib/comprovante-storage'

// Simulação por padrão. --apply move os comprovantes de public/uploads para o
// armazenamento privado e aponta o pedido para a rota autenticada.
async function migrarComprovantes() {
  const apply = process.argv.includes('--apply')
  const pedidos = await prisma.pedido.findMany({
    where: { fotoComprovante: { startsWith: '/uploads/comprovantes/' } },
    select: { id: true, fotoComprovante: true },
  })
  console.log(`${pedidos.length} comprovantes legados. Modo: ${apply ? 'aplicar' : 'simulação'}`)
  if (apply) await mkdir(COMPROVANTE_DIR, { recursive: true })
  for (const pedido of pedidos) {
    const arquivo = nomeArquivoComprovante(pedido.fotoComprovante!)
    if (!arquivo) {
      console.warn(`Pedido ${pedido.id}: caminho inválido, ignorado`)
      continue
    }
    if (!apply) {
      console.log(`Mover ${arquivo.fileName} (pedido ${pedido.id})`)
      continue
    }
    try {
      const origem = path.join(COMPROVANTE_LEGACY_DIR, arquivo.fileName)
      await copyFile(origem, path.join(COMPROVANTE_DIR, arquivo.fileName))
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: { fotoComprovante: urlComprovante(pedido.id, arquivo.fileName) },
      })
      await unlink(origem)
    } catch (error) {
      console.error(`Pedido ${pedido.id}:`, error)
      process.exitCode = 1
    }
  }
}
migrarComprovantes().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
