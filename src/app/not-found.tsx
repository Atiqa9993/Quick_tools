import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        {/* Big 404 */}
        <div className="relative mb-8">
          <p className="text-[120px] md:text-[160px] font-black text-slate-100 leading-none select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
          Page not found
        </h1>
        <p className="text-slate-500 text-lg max-w-md mb-10">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Home
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 border border-slate-200 text-slate-600 font-semibold px-6 py-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            View Pricing
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-14">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-4 font-semibold">Popular tools</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { href: '/tools/handwriting-to-text', label: 'Handwriting to Text' },
              { href: '/tools/pdf-to-text', label: 'PDF to Text' },
              { href: '/tools/image-to-pdf', label: 'Image to PDF' },
              { href: '/tools/bulk-ocr', label: 'Bulk OCR' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors font-medium"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
