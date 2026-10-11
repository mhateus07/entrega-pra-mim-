import { NextRequest, NextResponse } from 'next/server'
import { jsonResponse } from '@/lib/json-response'
import { requireGestor, badRequest, serverError } from '@/lib/auth-helpers'
import { carregarPedidosFechamento, csvClientes, csvMotoboys, porCliente, porMotoboy } from '@/lib/fechamento'

const DATA = /^\d{4}-\d{2}-\d{2}$/

// GET /api/fechamento?de=AAAA-MM-DD&ate=AAAA-MM-DD&visao=motoboy|cliente[&formato=csv]
// Relatório de fechamento da central ativa (só leitura).
export async function GET(request: NextRequest) {
  try {
    const auth = await requireGestor()
    if (!auth.authenticated) return auth.response

    const q = request.nextUrl.searchParams
    const de = q.get('de') ?? ''
    const ate = q.get('ate') ?? ''
    const visao = q.get('visao') === 'cliente' ? 'cliente' : 'motoboy'
    if (!DATA.test(de) || !DATA.test(ate) || Number.isNaN(Date.parse(de)) || Number.isNaN(Date.parse(ate))) {
      return badRequest('Informe o período no formato AAAA-MM-DD')
    }
    if (de > ate) return badRequest('A data inicial deve ser anterior à final')
    if (Date.parse(ate) - Date.parse(de) > 366 * 86_400_000) return badRequest('Período máximo de um ano')

    const { pedidos, repasse } = await carregarPedidosFechamento(auth.user.organizationId, de, ate)

    if (visao === 'motoboy') {
      const linhas = porMotoboy(pedidos, repasse)
      if (q.get('formato') === 'csv') return csv(csvMotoboys(linhas), `fechamento-motoboys-${de}_${ate}.csv`)
      return jsonResponse({ success: true, data: { visao, de, ate, repasse: Number(repasse), linhas } })
    }
    const linhas = porCliente(pedidos)
    if (q.get('formato') === 'csv') return csv(csvClientes(linhas), `fechamento-clientes-${de}_${ate}.csv`)
    return jsonResponse({ success: true, data: { visao, de, ate, linhas } })
  } catch (error) {
    console.error('Erro no fechamento:', error)
    return serverError('Erro ao gerar o fechamento')
  }
}

function csv(conteudo: string, nome: string) {
  return new NextResponse(conteudo, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nome}"`,
      'Cache-Control': 'no-store',
    },
  })
}
