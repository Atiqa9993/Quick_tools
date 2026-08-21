'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

/**
 * LayoutShell — Global wrapper injected from root layout.tsx.
 * Renders Navbar + Footer on all pages EXCEPT excluded auth routes.
 */
const EXCLUDED_PREFIXES = ['/auth', '/login', '/signup']

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideChrome = EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))

  return (
    <>
      {!hideChrome && <Navbar />}
      <main className="flex-1">{children}</main>
      {!hideChrome && <Footer />}
    </>
  )
}
