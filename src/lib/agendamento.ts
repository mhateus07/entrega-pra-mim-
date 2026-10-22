/** Converte o relógio local da central em UTC, sem depender do fuso do navegador. */
export function dataNoFuso(valor: string, fuso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) throw new Error('Informe data e hora válidas')
  const base = new Date(`${valor}:00Z`)
  if (!Number.isFinite(base.getTime()) || base.toISOString().slice(0, 16) !== valor) throw new Error('Data inválida')
  const formatador = new Intl.DateTimeFormat('sv-SE', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  const local = (data: Date) => formatador.format(data).replace(' ', 'T')
  let resultado = base
  for (let i = 0; i < 3; i++) {
    const diferenca = new Date(`${local(resultado)}:00Z`).getTime() - base.getTime()
    if (!diferenca) return resultado
    resultado = new Date(resultado.getTime() - diferenca)
  }
  throw new Error('Este horário não existe no fuso da central')
}
