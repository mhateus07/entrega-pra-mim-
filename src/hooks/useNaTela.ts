'use client'

import { useEffect, useRef, useState } from 'react'

/** Marca o elemento como visível na primeira vez que ele entra na tela (para disparar animações). */
export function useNaTela<T extends Element>(margem = '0px 0px -12% 0px') {
  const ref = useRef<T | null>(null)
  const [visivel, setVisivel] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || visivel) return
    const observer = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) { setVisivel(true); observer.disconnect() }
    }, { rootMargin: margem, threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [margem, visivel])
  return [ref, visivel] as const
}
