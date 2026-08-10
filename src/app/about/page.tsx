import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about HandwriteAI — our mission, the technology behind our AI-powered OCR tools, and the team building them.',
}

export default function About() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 pt-16 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 right-1/3 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-4">About</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Our mission</h1>
          <p className="text-blue-200/80 text-lg leading-relaxed">
            Making handwritten and scanned documents as useful as typed text — for everyone.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What we build</h2>
          <p className="text-slate-600 leading-relaxed text-lg">
            HandwriteAI is a suite of AI-powered document tools that run entirely on your local machine.
            We use open-source AI models (Tesseract OCR and Microsoft TrOCR) to achieve high accuracy on handwritten notes,
            scanned PDFs, and mixed documents — supporting 50+ languages out of the box. No cloud APIs, no data leaves your server.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Why privacy-first?</h2>
          <p className="text-slate-600 leading-relaxed text-lg">
            Your documents are personal. We built HandwriteAI so that file processing happens as close
            to your device as possible. We do not store your documents on our servers, and we never will.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { value: '10K+', label: 'Users worldwide' },
            { value: '99%', label: 'Accuracy rate' },
            { value: '50+', label: 'Languages supported' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
              <p className="text-3xl font-bold text-blue-600 mb-1">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  )
}
