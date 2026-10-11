// Limites e preços dos planos (docs/PLANO_NEGOCIO.md). Seguro para o navegador.
import type { PlanoOrganizacao } from '@prisma/client'

export const LIMITES_PLANO: Record<PlanoOrganizacao, { nome: string; motoboys: number; entregasMes: number; precoMensal: number }> = {
  ESSENCIAL: { nome: 'Essencial', motoboys: 5, entregasMes: 600, precoMensal: 149 },
  CENTRAL: { nome: 'Central', motoboys: 20, entregasMes: 2500, precoMensal: 299 },
  MARCA_PROPRIA: { nome: 'Marca própria', motoboys: 50, entregasMes: 6000, precoMensal: 499 },
}

// Passou do limite de entregas: segue aceitando e conta como excedente
// (R$ 0,10 cada). Só bloqueia acima de 120% do limite do plano.
export const TOLERANCIA_ENTREGAS = 1.2
export const VALOR_ENTREGA_EXCEDENTE = 0.1

export interface SituacaoEntregas {
  limite: number
  usadas: number
  excedentes: number
  valorExcedente: number
  bloqueado: boolean
}

export function situacaoEntregas(plano: PlanoOrganizacao, usadas: number): SituacaoEntregas {
  const limite = LIMITES_PLANO[plano].entregasMes
  const excedentes = Math.max(0, usadas - limite)
  return {
    limite,
    usadas,
    excedentes,
    valorExcedente: Math.round(excedentes * VALOR_ENTREGA_EXCEDENTE * 100) / 100,
    bloqueado: usadas >= Math.floor(limite * TOLERANCIA_ENTREGAS),
  }
}
