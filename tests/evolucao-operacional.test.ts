import { describe, expect, it } from 'vitest'
import { Prisma } from '@prisma/client'
import { dataNoFuso } from '@/lib/agendamento'
import { createPedidoSchema } from '@/lib/validations'
import { porMotoboy } from '@/lib/fechamento'

describe('agendamento e repasse congelado', () => {
  it('interpreta o relógio da central sem depender do navegador', () => {
    expect(dataNoFuso('2026-10-23T14:30', 'America/Sao_Paulo').toISOString()).toBe('2026-10-23T17:30:00.000Z')
    expect(dataNoFuso('2026-10-23T14:30', 'UTC').toISOString()).toBe('2026-10-23T14:30:00.000Z')
    expect(() => dataNoFuso('2026-02-30T14:30', 'UTC')).toThrow()
    expect(() => dataNoFuso('2026-03-08T02:30', 'America/New_York')).toThrow()
  })
  it('exige horário para entrega agendada e aceita o formato do formulário', () => {
    const base = { clienteId: 'cm00000000000000000000001', enderecoOrigemId: 'cm00000000000000000000002', enderecoDestinoId: 'cm00000000000000000000003', tipoServico: 'AGENDADA' }
    expect(createPedidoSchema.safeParse(base).success).toBe(false)
    expect(createPedidoSchema.safeParse({ ...base, dataAgendada: '2026-10-23T14:30' }).success).toBe(true)
  })
  it('alterar a porcentagem não muda corridas que já têm repasse acordado', () => {
    const pedidos = [{ motoboyId: 'm', motoboyNome: 'Ana', clienteId: 'c', clienteNome: 'Loja', distanciaKm: 3, valorTotal: new Prisma.Decimal(20), valorRepasse: new Prisma.Decimal(14), pagamento: { metodo: 'DINHEIRO', status: 'APROVADO', valor: new Prisma.Decimal(20) } }]
    expect(porMotoboy(pedidos, 0.8)[0]).toMatchObject({ repasse: 14, saldoAcerto: -6 })
    expect(porMotoboy(pedidos, 0.5)[0]).toMatchObject({ repasse: 14, saldoAcerto: -6 })
  })
})
