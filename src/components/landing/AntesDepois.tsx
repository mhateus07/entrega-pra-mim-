'use client'

import { useNaTela } from '@/hooks/useNaTela'
import { cn } from '@/utils/cn'

// O grupo de WhatsApp de toda central — riscado e trocado por uma corrida com dono, rota e comprovante
const MENSAGENS = [
  { quem: 'Central', texto: 'Alguém pega uma no Centro p/ São Mateus?', hora: '14:01' },
  { quem: 'Diego', texto: 'eu', hora: '14:01' },
  { quem: 'Carlos', texto: 'pego eu', hora: '14:01' },
  { quem: 'Central', texto: 'quem pegou??', hora: '14:04' },
  { quem: 'Farmácia', texto: 'cadê o motoboy??', hora: '14:19' },
]

export default function AntesDepois() {
  const [ref, visivel] = useNaTela<HTMLDivElement>('0px 0px -20% 0px')
  return (
    <div ref={ref} className="relative" data-visivel={visivel ? 'true' : 'false'}>
      <div className="relative space-y-2 pr-6 sm:pr-16" aria-label="Como é hoje no grupo de WhatsApp">
        {MENSAGENS.map((m, i) => (
          <div key={i} className={cn('relative max-w-[85%] rounded-xl bg-white/[0.07] px-3.5 py-2 text-[15px] text-white/85', m.quem === 'Central' ? 'ml-auto rounded-tr-sm' : 'rounded-tl-sm')}>
            <p className="text-[12px] font-semibold text-white/50">{m.quem}</p>
            <p>{m.texto} <span className="ml-1 font-mono text-[11px] text-white/40">{m.hora}</span></p>
            {/* Risco que passa por cima de cada mensagem, em sequência */}
            <span
              aria-hidden="true"
              className="absolute left-2 right-2 top-1/2 h-[3px] origin-left rounded bg-brand-mark"
              style={{ transform: `scaleX(${visivel ? 1 : 0})`, transition: `transform 0.45s cubic-bezier(0.2,0.8,0.2,1) ${0.5 + i * 0.16}s` }}
            />
          </div>
        ))}
      </div>

      <div
        className="relative z-10 -mt-10 ml-auto w-[92%] rounded-2xl border border-white/15 bg-white p-5 text-[#141413] shadow-[0_24px_60px_rgba(0,0,0,0.55)] sm:w-[86%]"
        style={{
          opacity: visivel ? 1 : 0, transform: visivel ? 'none' : 'translateY(24px) rotate(1.5deg)',
          transition: 'opacity 0.5s, transform 0.7s cubic-bezier(0.34,1.56,0.64,1)', transitionDelay: '1.5s',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="rotulo text-[#6f6d66]">Corrida #4821 · Farmácia Central</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-base font-semibold sm:text-lg">
              Centro
              <span className="flex items-center" aria-hidden="true">
                <span className="h-3 w-3 rounded-full border-[2.5px] border-[#141413]" />
                <span className="mx-0.5 w-6 border-t-2 border-dotted border-[#9a988f] sm:w-12" />
                <span className="h-3 w-3 rounded-full bg-[#e2570f]" />
              </span>
              <span className="whitespace-nowrap">São Mateus</span>
            </p>
          </div>
          <p className="whitespace-nowrap font-mono text-lg font-medium tabular sm:text-xl">R$ 14,00</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#fdeee5] px-2.5 text-[#b8440a]"><span className="h-1.5 w-1.5 rounded-full bg-current" />Em entrega</span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#f1f0eb] px-2.5">Motoboy: Diego · <span className="font-mono font-medium">RTA-4E21</span></span>
          <span className="inline-flex h-7 items-center rounded-md bg-[#e6f4ea] px-2.5 text-[#11793a]">Link enviado ao cliente</span>
        </div>
      </div>
    </div>
  )
}
