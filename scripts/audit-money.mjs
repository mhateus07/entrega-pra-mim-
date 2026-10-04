import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const fields = {
  pedidos: ['valorBase', 'valorTotal'],
  pagamentos: ['valor', 'taxaPlataforma', 'valorMotoboy'],
  saldos_motoboy: ['saldoDisponivel', 'saldoPendente', 'totalRecebido'],
  transacoes_motoboy: ['valor'],
}
// Somente leitura. Identificadores vêm exclusivamente da lista fixa acima.
try {
  const results = []
  for (const [table, columns] of Object.entries(fields)) {
    for (const column of columns) {
      const identifier = Prisma.raw(`\`${column}\``)
      const rows = await prisma.$queryRaw`
        SELECT COUNT(*) AS registros,
          COALESCE(SUM(ABS(${identifier}) > 999999999999.99), 0) AS foraDoLimite,
          COALESCE(SUM(ABS(${identifier} - ROUND(${identifier}, 2)) > 0.0000001), 0) AS valoresComMaisDeDuasCasas,
          MIN(${identifier}) AS minimo, MAX(${identifier}) AS maximo
        FROM ${Prisma.raw(`\`${table}\``)}
      `
      results.push({ tabela: table, coluna: column, ...rows[0] })
    }
  }
  console.log(JSON.stringify(results, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2))
  if (results.some(row => Number(row.foraDoLimite) > 0 || Number(row.valoresComMaisDeDuasCasas) > 0)) process.exitCode = 1
} catch (error) {
  console.error('Não foi possível concluir a auditoria monetária:', error.message)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
