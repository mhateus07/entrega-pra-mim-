'use client'

import { useSyncExternalStore } from 'react'

const subscribe = (listener: () => void) => {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener) }
}
export default function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  return online ? null : <div role="alert" className="sticky top-0 z-50 bg-warning-soft px-4 py-3 text-center text-sm font-medium text-warning">Sem conexão. Os dados podem estar desatualizados. Aguarde a confirmação antes de repetir uma ação.</div>
}
