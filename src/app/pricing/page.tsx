import type { Metadata } from 'next'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: 'Pricing | QuickTools - Simple & Transparent',
  description:
    'Start for free, upgrade when you grow. Simple, transparent pricing for all QuickTools developer & document utilities.',
  openGraph: {
    title: 'Pricing | QuickTools',
    description:
      'Start free with 10 tools per day. Upgrade to Pro for unlimited access, larger files, and developer API access.',
  },
}

export default function PricingPage() {
  return <PricingClient />
}