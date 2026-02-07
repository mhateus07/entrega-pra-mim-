const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Senha padrão para todos os usuários demo
  const senhaHash = await bcrypt.hash('Demo@123', 10);

  // Criar Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@entregapramim.com.br' },
    update: {},
    create: {
      id: 'admin-demo-001',
      email: 'admin@entregapramim.com.br',
      senha: senhaHash,
      nome: 'Administrador Demo',
      telefone: '11999990000',
      role: 'ADMIN',
      updatedAt: new Date(),
    },
  });
  console.log('✅ Admin criado:', admin.email);

  // Criar Cliente
  const clienteUser = await prisma.user.upsert({
    where: { email: 'cliente@entregapramim.com.br' },
    update: {},
    create: {
      id: 'cliente-demo-001',
      email: 'cliente@entregapramim.com.br',
      senha: senhaHash,
      nome: 'Cliente Demonstração',
      telefone: '11999991111',
      role: 'CLIENTE',
      updatedAt: new Date(),
    },
  });

  await prisma.cliente.upsert({
    where: { userId: clienteUser.id },
    update: {},
    create: {
      userId: clienteUser.id,
      cpfCnpj: '12345678900',
      tipoPessoa: 'PF',
      updatedAt: new Date(),
    },
  });
  console.log('✅ Cliente criado:', clienteUser.email);

  // Criar Motoboy
  const motoboyUser = await prisma.user.upsert({
    where: { email: 'motoboy@entregapramim.com.br' },
    update: {},
    create: {
      id: 'motoboy-demo-001',
      email: 'motoboy@entregapramim.com.br',
      senha: senhaHash,
      nome: 'João Motoboy',
      telefone: '11999992222',
      role: 'MOTOBOY',
      updatedAt: new Date(),
    },
  });

  const motoboy = await prisma.motoboy.upsert({
    where: { userId: motoboyUser.id },
    update: {},
    create: {
      userId: motoboyUser.id,
      cnh: '12345678900',
      veiculoTipo: 'Moto',
      veiculoMarca: 'Honda',
      veiculoModelo: 'CG 160',
      veiculoPlaca: 'ABC1D23',
      status: 'DISPONIVEL',
      avaliacaoMedia: 4.8,
      totalEntregas: 127,
      updatedAt: new Date(),
    },
  });

  // Criar saldo para o motoboy
  await prisma.saldoMotoboy.upsert({
    where: { motoboyId: motoboy.id },
    update: {},
    create: {
      motoboyId: motoboy.id,
      saldoDisponivel: 150.00,
      saldoPendente: 45.00,
      totalRecebido: 1250.00,
      updatedAt: new Date(),
    },
  });

  console.log('✅ Motoboy criado:', motoboyUser.email);

  console.log('\n🎉 Usuários de demonstração criados com sucesso!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 CREDENCIAIS DE ACESSO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 Senha para todos: Demo@123\n');
  console.log('👤 Admin:   admin@entregapramim.com.br');
  console.log('👤 Cliente: cliente@entregapramim.com.br');
  console.log('👤 Motoboy: motoboy@entregapramim.com.br');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
