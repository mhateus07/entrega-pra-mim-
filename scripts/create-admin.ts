import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx scripts/create-admin.ts
// A senha nunca é fixa no código nem impressa no terminal.
async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@entregapramim.com'
  const senha = process.env.ADMIN_PASSWORD || ''
  const nome = process.env.ADMIN_NOME || 'Administrador'
  const telefone = process.env.ADMIN_TELEFONE || '11999999999'

  if (senha.length < 12) {
    throw new Error('Defina ADMIN_PASSWORD com pelo menos 12 caracteres')
  }

  // Hash da senha
  const senhaHash = await bcrypt.hash(senha, 10)

  // Criar ou atualizar admin
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      senha: senhaHash,
      nome,
      telefone,
      role: 'ADMIN',
    },
    create: {
      email,
      senha: senhaHash,
      nome,
      telefone,
      role: 'ADMIN',
    },
  })

  console.log('='.repeat(50))
  console.log('Usuario administrador criado/atualizado com sucesso!')
  console.log('='.repeat(50))
  console.log('')
  console.log('Credenciais:')
  console.log(`  Email: ${email}`)
  console.log('')
  console.log(`ID do usuario: ${admin.id}`)
  console.log('='.repeat(50))
}

main()
  .catch((e) => {
    console.error('Erro ao criar admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
