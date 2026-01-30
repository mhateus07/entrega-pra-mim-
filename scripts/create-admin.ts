import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@entregapramim.com'
  const senha = 'admin123'
  const nome = 'Administrador'
  const telefone = '11999999999'

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
  console.log(`  Senha: ${senha}`)
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
