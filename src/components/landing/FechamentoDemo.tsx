import Odometro from '@/components/brand/Odometro'

// Fechamento de um dia de verdade (repasse de 70% menos o dinheiro recebido em mãos)
const LINHAS = [
  { nome: 'Diego', corridas: '23', repasse: '225,40', dinheiro: '120,00', acerto: '105,40' },
  { nome: 'Carla', corridas: '19', repasse: '187,60', dinheiro: '58,00', acerto: '129,60' },
  { nome: 'Rafael', corridas: '14', repasse: '131,95', dinheiro: '160,00', acerto: '-28,05' },
]

export default function FechamentoDemo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-end justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <p className="rotulo text-fg-3">Fechamento · hoje</p>
          <p className="mt-1 text-[15px] font-semibold text-fg">56 corridas entregues</p>
        </div>
        <div className="text-right">
          <p className="rotulo text-fg-3">A cobrar das empresas</p>
          <p className="text-[28px] font-medium leading-none text-fg"><span className="font-mono">R$ </span><Odometro valor="440,50" /></p>
        </div>
      </div>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-fg-3">
            <th className="px-5 py-2.5 font-medium">Motoboy</th>
            <th className="px-2 py-2.5 text-right font-medium">Corridas</th>
            <th className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">Repasse</th>
            <th className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">Em mãos</th>
            <th className="px-5 py-2.5 text-right font-medium">Acerto</th>
          </tr>
        </thead>
        <tbody>
          {LINHAS.map((l, i) => (
            <tr key={l.nome} className="border-t border-line">
              <td className="px-5 py-3 font-semibold text-fg">{l.nome}</td>
              <td className="px-2 py-3 text-right"><Odometro valor={l.corridas} atraso={0.1 + i * 0.1} /></td>
              <td className="hidden px-2 py-3 text-right text-fg-2 sm:table-cell"><Odometro valor={l.repasse} atraso={0.15 + i * 0.1} /></td>
              <td className="hidden px-2 py-3 text-right text-fg-2 sm:table-cell"><Odometro valor={l.dinheiro} atraso={0.2 + i * 0.1} /></td>
              <td className={`px-5 py-3 text-right font-semibold ${l.acerto.startsWith('-') ? 'text-danger' : 'text-fg'}`}>
                <Odometro valor={l.acerto} atraso={0.25 + i * 0.1} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-line bg-surface-2 px-5 py-3 text-[13px] text-fg-2">
        <span>Acerto negativo: o motoboy devolve à central</span>
        <span className="font-mono">CSV ↓</span>
      </div>
    </div>
  )
}
