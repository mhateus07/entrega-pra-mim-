// Página inicial de acordo com o papel na organização ativa (seguro para o navegador)
export function paginaInicial(orgRole: string | null | undefined, superadmin?: boolean): string {
  if (orgRole === 'OWNER' || orgRole === 'DISPATCHER' || (superadmin && !orgRole)) return '/dashboard'
  if (orgRole === 'DRIVER') return '/motoboy'
  return '/cliente'
}
