import { cn } from '@/utils/cn'

/** Placa no padrão Mercosul: tarja azul com o rótulo e o código em mono. */
export default function Placa({ rotulo, valor, className }: { rotulo: string; valor: string; className?: string }) {
  return (
    <span className={cn('placa', className)}>
      <b>{rotulo}</b>
      <span>{valor}</span>
    </span>
  )
}
