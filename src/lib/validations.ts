import { z } from 'zod'

// Regex patterns
const telefoneRegex = /^\d{10,11}$/
const cepRegex = /^\d{8}$/
const cnhRegex = /^\d{11}$/
const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i

// Schema de usuário
export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  telefone: z.string().regex(telefoneRegex, 'Telefone inválido').optional(),
  role: z.enum(['ADMIN', 'CLIENTE', 'MOTOBOY']).default('CLIENTE'),
})

// Schema de motoboy
export const createMotoboySchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  telefone: z.string().regex(telefoneRegex, 'Telefone inválido'),
  cnh: z.string().regex(cnhRegex, 'CNH inválida'),
  veiculoTipo: z.string().min(1, 'Tipo de veículo é obrigatório'),
  veiculoMarca: z.string().min(1, 'Marca do veículo é obrigatória'),
  veiculoModelo: z.string().min(1, 'Modelo do veículo é obrigatório'),
  veiculoPlaca: z.string().regex(placaRegex, 'Placa inválida'),
})

export const updateMotoboySchema = z.object({
  nome: z.string().min(2).optional(),
  telefone: z.string().regex(telefoneRegex).optional(),
  veiculoTipo: z.string().min(1).optional(),
  veiculoMarca: z.string().min(1).optional(),
  veiculoModelo: z.string().min(1).optional(),
  veiculoPlaca: z.string().regex(placaRegex).optional(),
  status: z.enum(['DISPONIVEL', 'EM_ENTREGA', 'OFFLINE']).optional(),
  latitudeAtual: z.number().min(-90).max(90).optional(),
  longitudeAtual: z.number().min(-180).max(180).optional(),
})

// Schema de disponibilidade
export const disponibilidadeSchema = z.object({
  diaSemana: z.enum([
    'DOMINGO',
    'SEGUNDA',
    'TERCA',
    'QUARTA',
    'QUINTA',
    'SEXTA',
    'SABADO',
  ]),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)'),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)'),
  ativo: z.boolean().default(true),
})

export const updateDisponibilidadeSchema = z.array(disponibilidadeSchema)

// Schema de cliente
export const createClienteSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  telefone: z.string().regex(telefoneRegex, 'Telefone inválido').optional(),
  cpfCnpj: z.string().optional(),
  tipoPessoa: z.enum(['PF', 'PJ']).default('PF'),
  razaoSocial: z.string().optional(),
})

export const updateClienteSchema = z.object({
  nome: z.string().min(2).optional(),
  telefone: z.string().regex(telefoneRegex).optional(),
  cpfCnpj: z.string().optional(),
  tipoPessoa: z.enum(['PF', 'PJ']).optional(),
  razaoSocial: z.string().optional(),
})

// Schema de endereço
export const createEnderecoSchema = z.object({
  clienteId: z.string().cuid('ID de cliente inválido'),
  apelido: z.string().optional(),
  cep: z.string().regex(cepRegex, 'CEP inválido'),
  logradouro: z.string().min(1, 'Logradouro é obrigatório'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().length(2, 'Estado deve ter 2 caracteres'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  favorito: z.boolean().default(false),
})

export const updateEnderecoSchema = z.object({
  apelido: z.string().optional(),
  cep: z.string().regex(cepRegex).optional(),
  logradouro: z.string().min(1).optional(),
  numero: z.string().min(1).optional(),
  complemento: z.string().optional(),
  bairro: z.string().min(1).optional(),
  cidade: z.string().min(1).optional(),
  estado: z.string().length(2).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  favorito: z.boolean().optional(),
})

// Schema de pedido
export const createPedidoSchema = z.object({
  clienteId: z.string().cuid('ID de cliente inválido'),
  enderecoOrigemId: z.string().cuid('ID de endereço origem inválido'),
  enderecoDestinoId: z.string().cuid('ID de endereço destino inválido'),
  tipoServico: z.enum(['EXPRESSA', 'AGENDADA', 'DOCUMENTOS']),
  descricaoItem: z.string().optional(),
  observacoes: z.string().optional(),
  pesoAproximado: z.number().positive().optional(),
  dataAgendada: z.string().datetime().optional(),
})

export const updatePedidoStatusSchema = z.object({
  status: z.enum([
    'SOLICITADO',
    'ACEITO',
    'EM_COLETA',
    'EM_ENTREGA',
    'ENTREGUE',
    'CANCELADO',
  ]),
  motoboyId: z.string().cuid().optional(),
  motivoCancelamento: z.string().optional(),
  assinaturaRecebedor: z.string().optional(),
  fotoComprovante: z.string().optional(),
})

// Schema de avaliação
export const createAvaliacaoSchema = z.object({
  pedidoId: z.string().cuid('ID de pedido inválido'),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
})

// Schema de cálculo de rota
export const calcularRotaSchema = z.object({
  origemLatitude: z.number().min(-90).max(90),
  origemLongitude: z.number().min(-180).max(180),
  destinoLatitude: z.number().min(-90).max(90),
  destinoLongitude: z.number().min(-180).max(180),
  tipoServico: z.enum(['EXPRESSA', 'AGENDADA', 'DOCUMENTOS']),
})

// Schema de login
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
})

// Schema de atualização de localização
export const updateLocalizacaoSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

// Tipos inferidos
export type CreateUserInput = z.infer<typeof createUserSchema>
export type CreateMotoboyInput = z.infer<typeof createMotoboySchema>
export type UpdateMotoboyInput = z.infer<typeof updateMotoboySchema>
export type DisponibilidadeInput = z.infer<typeof disponibilidadeSchema>
export type CreateClienteInput = z.infer<typeof createClienteSchema>
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>
export type CreateEnderecoInput = z.infer<typeof createEnderecoSchema>
export type UpdateEnderecoInput = z.infer<typeof updateEnderecoSchema>
export type CreatePedidoInput = z.infer<typeof createPedidoSchema>
export type UpdatePedidoStatusInput = z.infer<typeof updatePedidoStatusSchema>
export type CreateAvaliacaoInput = z.infer<typeof createAvaliacaoSchema>
export type CalcularRotaInput = z.infer<typeof calcularRotaSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateLocalizacaoInput = z.infer<typeof updateLocalizacaoSchema>
