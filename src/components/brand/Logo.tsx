import { cn } from '@/utils/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={cn('h-8 w-8 shrink-0', className)}>
      <rect width="512" height="512" rx="112" fill="#E2570F" />
      <circle cx="158" cy="354" r="38" fill="#fff" />
      <path
        d="M226 286 L346 166 M222 166 H346 V290"
        fill="none"
        stroke="#fff"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Logo({ className, markClassName, hideText }: { className?: string; markClassName?: string; hideText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      {!hideText && (
        <span className="text-[15px] font-semibold tracking-tight text-fg">
          Entrega Pra Mim
        </span>
      )}
    </span>
  )
}
