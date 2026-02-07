// Validação de variáveis de ambiente obrigatórias
// Este arquivo deve ser importado no início da aplicação

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
] as const

const optionalEnvVars = [
  'GOOGLE_MAPS_API_KEY',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'PAYMENT_WEBHOOK_SECRET',
] as const

type RequiredEnvVar = (typeof requiredEnvVars)[number]
type OptionalEnvVar = (typeof optionalEnvVars)[number]

interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

export function validateEnv(): EnvValidationResult {
  const missing: string[] = []
  const warnings: string[] = []

  // Verificar variáveis obrigatórias
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  // Verificar se NEXTAUTH_SECRET é seguro
  const secret = process.env.NEXTAUTH_SECRET
  if (secret && (secret.length < 32 || secret.includes('development') || secret.includes('secret'))) {
    warnings.push('NEXTAUTH_SECRET parece ser fraco. Use: openssl rand -base64 32')
  }

  // Verificar se DATABASE_URL tem credenciais padrão
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl && (dbUrl.includes('root:root') || dbUrl.includes('password') || dbUrl.includes(':123@'))) {
    warnings.push('DATABASE_URL contém credenciais fracas')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

export function assertEnv(): void {
  const result = validateEnv()

  if (!result.valid) {
    console.error('='.repeat(60))
    console.error('ERRO: Variáveis de ambiente obrigatórias não configuradas!')
    console.error('='.repeat(60))
    console.error('Variáveis faltando:')
    result.missing.forEach((v) => console.error(`  - ${v}`))
    console.error('')
    console.error('Copie .env.example para .env e configure os valores.')
    console.error('='.repeat(60))

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Variáveis de ambiente obrigatórias não configuradas: ${result.missing.join(', ')}`)
    }
  }

  if (result.warnings.length > 0) {
    console.warn('='.repeat(60))
    console.warn('AVISOS de configuração:')
    console.warn('='.repeat(60))
    result.warnings.forEach((w) => console.warn(`  - ${w}`))
    console.warn('='.repeat(60))
  }
}

// Função helper para obter variável com fallback seguro
export function getEnv(key: RequiredEnvVar): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Variável de ambiente ${key} não configurada`)
  }
  return value
}

export function getOptionalEnv(key: OptionalEnvVar, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue
}

// Exportar variáveis tipadas para uso no código
export const env = {
  get DATABASE_URL() {
    return getEnv('DATABASE_URL')
  },
  get NEXTAUTH_SECRET() {
    return getEnv('NEXTAUTH_SECRET')
  },
  get NEXTAUTH_URL() {
    return getEnv('NEXTAUTH_URL')
  },
  get GOOGLE_MAPS_API_KEY() {
    return getOptionalEnv('GOOGLE_MAPS_API_KEY') || ''
  },
  get NEXT_PUBLIC_GOOGLE_MAPS_API_KEY() {
    return getOptionalEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY') || ''
  },
  get PAYMENT_WEBHOOK_SECRET() {
    return getOptionalEnv('PAYMENT_WEBHOOK_SECRET')
  },
}
