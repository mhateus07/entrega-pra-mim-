import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { marcaPublica } from '@/lib/marca'
import LoginCentral from './LoginCentral'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const marca = await marcaPublica(slug)
  return {
    title: marca ? `Entrar · ${marca.nome}` : 'Entrar',
    manifest: `/o/${slug}/manifest.webmanifest`,
    ...(marca?.corPrimaria ? { other: { 'theme-color': marca.corPrimaria } } : {}),
  }
}

// Login com a marca da central: o link que a central passa para a equipe e os clientes
export default async function Page({ params }: Props) {
  const { slug } = await params
  const marca = await marcaPublica(slug)
  if (!marca) notFound()
  return <LoginCentral marca={marca} />
}
