import type { Metadata } from 'next'
import ToolClient from './ToolClient'
import { allToolsConfig } from '@/lib/toolData'

export async function generateStaticParams() {
  return Object.keys(allToolsConfig).map((slug) => ({ slug }))
}

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tool = allToolsConfig[slug]

  if (!tool) {
    return { title: 'Tool Not Found' }
  }

  return {
    title: tool.name,
    description: tool.desc,
    openGraph: {
      title: `${tool.name} — QuickTools`,
      description: tool.desc,
    },
  }
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params
  return <ToolClient slug={slug} />
}