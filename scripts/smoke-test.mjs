const baseUrl = (process.env.SMOKE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const cronSecret = process.env.SMOKE_CRON_SECRET || ''

const checks = [
  ['home', 200, `${baseUrl}/`],
  ['health live', 200, `${baseUrl}/api/health/live`],
  ['health ready', 200, `${baseUrl}/api/health/ready`],
  ['auth providers público', 200, `${baseUrl}/api/auth/providers`],
  ['pedidos sem sessão', 401, `${baseUrl}/api/pedidos`],
  ['organização pública inexistente', 404, `${baseUrl}/api/publico/organizacoes/__smoke_inexistente__`],
]

let falhas = 0

async function verificar(nome, esperado, url, init) {
  try {
    const response = await fetch(url, init)
    const passou = response.status === esperado
    console.log(`${passou ? 'OK' : 'FALHA'}  ${nome}: esperado ${esperado}, recebido ${response.status}`)
    if (!passou) falhas++
  } catch (error) {
    console.error(`FALHA  ${nome}: ${error instanceof Error ? error.message : error}`)
    falhas++
  }
}

for (const [nome, esperado, url] of checks) await verificar(nome, esperado, url)
await verificar('cron sem segredo', 401, `${baseUrl}/api/jobs/despacho`, { method: 'POST' })

if (cronSecret) {
  await verificar('cron com segredo', 200, `${baseUrl}/api/jobs/despacho`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cronSecret}` },
  })
} else {
  console.log('INFO   cron com segredo: ignorado; defina SMOKE_CRON_SECRET para validar o job')
}

if (falhas > 0) {
  console.error(`Smoke test falhou com ${falhas} verificação(ões).`)
  process.exitCode = 1
} else {
  console.log(`Smoke test concluído contra ${baseUrl}.`)
}
