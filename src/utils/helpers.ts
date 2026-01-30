import { StatusPedido, StatusMotoboy, TipoServico, DiaSemana } from '@prisma/client'

// Formatadores
export function formatarCPF(cpf: string): string {
  const numeros = cpf.replace(/\D/g, '')
  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatarCNPJ(cnpj: string): string {
  const numeros = cnpj.replace(/\D/g, '')
  return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatarTelefone(telefone: string): string {
  const numeros = telefone.replace(/\D/g, '')
  if (numeros.length === 11) {
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export function formatarCEP(cep: string): string {
  const numeros = cep.replace(/\D/g, '')
  return numeros.replace(/(\d{5})(\d{3})/, '$1-$2')
}

export function formatarPlaca(placa: string): string {
  const texto = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  // Placa Mercosul: ABC1D23 ou antiga: ABC-1234
  if (texto.length === 7) {
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(texto)) {
      // Mercosul
      return texto.replace(/([A-Z]{3})([0-9])([A-Z])([0-9]{2})/, '$1$2$3$4')
    }
    // Antiga
    return texto.replace(/([A-Z]{3})([0-9]{4})/, '$1-$2')
  }
  return texto
}

export function formatarData(data: Date | string): string {
  const d = new Date(data)
  return d.toLocaleDateString('pt-BR')
}

export function formatarDataHora(data: Date | string): string {
  const d = new Date(data)
  return d.toLocaleString('pt-BR')
}

export function formatarHora(data: Date | string): string {
  const d = new Date(data)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Validadores
export function validarCPF(cpf: string): boolean {
  const numeros = cpf.replace(/\D/g, '')

  if (numeros.length !== 11) return false
  if (/^(\d)\1+$/.test(numeros)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros.charAt(i)) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numeros.charAt(9))) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros.charAt(i)) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numeros.charAt(10))) return false

  return true
}

export function validarCNPJ(cnpj: string): boolean {
  const numeros = cnpj.replace(/\D/g, '')

  if (numeros.length !== 14) return false
  if (/^(\d)\1+$/.test(numeros)) return false

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let soma = 0
  for (let i = 0; i < 12; i++) {
    soma += parseInt(numeros.charAt(i)) * pesos1[i]
  }
  let resto = soma % 11
  const digito1 = resto < 2 ? 0 : 11 - resto

  if (digito1 !== parseInt(numeros.charAt(12))) return false

  soma = 0
  for (let i = 0; i < 13; i++) {
    soma += parseInt(numeros.charAt(i)) * pesos2[i]
  }
  resto = soma % 11
  const digito2 = resto < 2 ? 0 : 11 - resto

  return digito2 === parseInt(numeros.charAt(13))
}

export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

export function validarTelefone(telefone: string): boolean {
  const numeros = telefone.replace(/\D/g, '')
  return numeros.length >= 10 && numeros.length <= 11
}

export function validarCEP(cep: string): boolean {
  const numeros = cep.replace(/\D/g, '')
  return numeros.length === 8
}

export function validarCNH(cnh: string): boolean {
  const numeros = cnh.replace(/\D/g, '')
  return numeros.length === 11
}

export function validarPlaca(placa: string): boolean {
  const texto = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  // Placa antiga: ABC1234 ou Mercosul: ABC1D23
  const regexAntiga = /^[A-Z]{3}[0-9]{4}$/
  const regexMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/
  return regexAntiga.test(texto) || regexMercosul.test(texto)
}

// Labels e mapeamentos
export const LABELS_STATUS_PEDIDO: Record<StatusPedido, string> = {
  SOLICITADO: 'Solicitado',
  ACEITO: 'Aceito',
  EM_COLETA: 'Em Coleta',
  EM_ENTREGA: 'Em Entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
}

export const LABELS_STATUS_MOTOBOY: Record<StatusMotoboy, string> = {
  DISPONIVEL: 'Disponível',
  EM_ENTREGA: 'Em Entrega',
  OFFLINE: 'Offline',
}

export const LABELS_TIPO_SERVICO: Record<TipoServico, string> = {
  EXPRESSA: 'Expressa',
  AGENDADA: 'Agendada',
  DOCUMENTOS: 'Documentos',
}

export const LABELS_DIA_SEMANA: Record<DiaSemana, string> = {
  DOMINGO: 'Domingo',
  SEGUNDA: 'Segunda-feira',
  TERCA: 'Terça-feira',
  QUARTA: 'Quarta-feira',
  QUINTA: 'Quinta-feira',
  SEXTA: 'Sexta-feira',
  SABADO: 'Sábado',
}

// Cores para status
export const CORES_STATUS_PEDIDO: Record<StatusPedido, string> = {
  SOLICITADO: 'bg-yellow-100 text-yellow-800',
  ACEITO: 'bg-blue-100 text-blue-800',
  EM_COLETA: 'bg-purple-100 text-purple-800',
  EM_ENTREGA: 'bg-indigo-100 text-indigo-800',
  ENTREGUE: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
}

export const CORES_STATUS_MOTOBOY: Record<StatusMotoboy, string> = {
  DISPONIVEL: 'bg-green-100 text-green-800',
  EM_ENTREGA: 'bg-blue-100 text-blue-800',
  OFFLINE: 'bg-gray-100 text-gray-800',
}

// Utilitários
export function gerarCodigoPedido(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `PED-${timestamp}-${random}`
}

export function calcularIdade(dataNascimento: Date): number {
  const hoje = new Date()
  let idade = hoje.getFullYear() - dataNascimento.getFullYear()
  const m = hoje.getMonth() - dataNascimento.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < dataNascimento.getDate())) {
    idade--
  }
  return idade
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function truncarTexto(texto: string, tamanho: number): string {
  if (texto.length <= tamanho) return texto
  return texto.substring(0, tamanho - 3) + '...'
}

// Ordenação e filtros
export function ordenarPorData<T extends { createdAt: Date }>(
  items: T[],
  ordem: 'asc' | 'desc' = 'desc'
): T[] {
  return [...items].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return ordem === 'asc' ? diff : -diff
  })
}
