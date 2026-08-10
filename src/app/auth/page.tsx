import type { Metadata } from 'next'
import AuthClient from './AuthClient'

export const metadata: Metadata = {
  title: 'Sign In — QuickTools',
  description:
    'Sign in or create your free QuickTools account to access advanced features, cloud storage, and API keys.',
  openGraph: {
    title: 'Sign In — QuickTools',
    description:
      'Access advanced PDF, image, and text tools with your QuickTools account.',
  },
}

export default function AuthPage() {
  return <AuthClient />
}
