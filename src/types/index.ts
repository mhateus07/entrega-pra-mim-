import { UserRole, StatusMotoboy, TipoServico, StatusPedido, DiaSemana } from '@prisma/client'

// Extensão dos tipos do NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      motoboyId: string | null
      clienteId: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    motoboyId: string | null
    clienteId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    motoboyId: string | null
    clienteId: string | null
  }
}

// Types para API
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Types para criação de usuário
export interface CreateUserInput {
  email: string
  senha: string
  nome: string
  telefone?: string
  role: UserRole
}

// Types para motoboy
export interface CreateMotoboyInput {
  email: string
  senha: string
  nome: string
  telefone: string
  cnh: string
  veiculoTipo: string
  veiculoMarca: string
  veiculoModelo: string
  veiculoPlaca: string
}

export interface UpdateMotoboyInput {
  nome?: string
  telefone?: string
  veiculoTipo?: string
  veiculoMarca?: string
  veiculoModelo?: string
  veiculoPlaca?: string
  status?: StatusMotoboy
  latitudeAtual?: number
  longitudeAtual?: number
}

export interface DisponibilidadeInput {
  diaSemana: DiaSemana
  horaInicio: string
  horaFim: string
  ativo?: boolean
}

// Types para cliente
export interface CreateClienteInput {
  email: string
  senha: string
  nome: string
  telefone?: string
  cpfCnpj?: string
  tipoPessoa?: 'PF' | 'PJ'
  razaoSocial?: string
}

export interface UpdateClienteInput {
  nome?: string
  telefone?: string
  cpfCnpj?: string
  tipoPessoa?: 'PF' | 'PJ'
  razaoSocial?: string
}

// Types para endereço
export interface CreateEnderecoInput {
  clienteId: string
  apelido?: string
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  latitude?: number
  longitude?: number
  favorito?: boolean
}

export interface UpdateEnderecoInput {
  apelido?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  latitude?: number
  longitude?: number
  favorito?: boolean
}

// Types para pedido
export interface CreatePedidoInput {
  clienteId: string
  enderecoOrigemId: string
  enderecoDestinoId: string
  tipoServico: TipoServico
  descricaoItem?: string
  observacoes?: string
  pesoAproximado?: number
  dataAgendada?: string // ISO date string
}

export interface UpdatePedidoStatusInput {
  status: StatusPedido
  motoboyId?: string
  motivoCancelamento?: string
  assinaturaRecebedor?: string
  fotoComprovante?: string
}

// Types para avaliação
export interface CreateAvaliacaoInput {
  pedidoId: string
  nota: number
  comentario?: string
}

// Types para cálculo de rota
export interface CalcularRotaInput {
  origemLatitude: number
  origemLongitude: number
  destinoLatitude: number
  destinoLongitude: number
  tipoServico: TipoServico
}

export interface RotaCalculada {
  distanciaKm: number
  duracaoMinutos: number
  valorBase: number
  multiplicador: number
  valorTotal: number
  polyline?: string
}

// Types para listagem com filtros
export interface PedidoFiltros {
  status?: StatusPedido
  tipoServico?: TipoServico
  clienteId?: string
  motoboyId?: string
  dataInicio?: string
  dataFim?: string
}

export interface MotoboyFiltros {
  status?: StatusMotoboy
  avaliacaoMinima?: number
  disponivel?: boolean
}

// Re-exportar enums do Prisma
export { UserRole, StatusMotoboy, TipoServico, StatusPedido, DiaSemana }
