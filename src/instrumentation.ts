// Executado uma vez quando o servidor Next.js sobe (não roda no build).
// Em produção, a falta de variável obrigatória encerra o processo: o Next
// apenas registraria o erro e seguiria respondendo 500 em todas as rotas.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnv } = await import('./lib/env')
    try {
      assertEnv()
    } catch (error) {
      console.error(error instanceof Error ? error.message : error)
      process.exit(1)
    }
  }
}
