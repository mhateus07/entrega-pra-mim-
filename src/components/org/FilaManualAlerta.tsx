'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Alert } from '@/components/ui/Feedback'

// Avisa o despachante quando há pedidos que ninguém aceitou
export default function FilaManualAlerta() {
  const [quantidade, setQuantidade] = useState(0)
  useEffect(() => {
    const carregar = () => fetch('/api/despacho/fila').then((r) => r.json())
      .then((b) => { if (b.success) setQuantidade(b.data.manual.length) }).catch(() => {})
    void carregar()
    const timer = setInterval(carregar, 15_000)
    return () => clearInterval(timer)
  }, [])
  if (quantidade === 0) return null
  return (
    <Alert variant="danger" icon={AlertTriangle} title={`${quantidade} ${quantidade === 1 ? 'pedido está' : 'pedidos estão'} sem motoboy`}>
      <Link href="/dashboard/despacho" className="inline-flex items-center gap-1 font-medium text-fg underline-offset-2 hover:underline">
        Atribuir manualmente <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Alert>
  )
}
