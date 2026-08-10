import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'HandwriteAI Privacy Policy — how we handle your data, what we store, and your rights.',
}

const sections = [
  {
    title: '1. What data we collect',
    body: `We collect your email address when you create an account, and we track how many pages you've processed (to enforce free-plan limits). We do not collect the content of the documents you process.`,
  },
  {
    title: '2. How your documents are processed',
    body: `When you upload a file, it is processed entirely on our local server using open-source AI models (Tesseract OCR and TrOCR). Your files are never sent to any external cloud API. The extracted text is returned to your browser only.`,
  },
  {
    title: '3. Cookies',
    body: `We use session cookies to keep you logged in (via Supabase Auth). We do not use tracking or advertising cookies.`,
  },
  {
    title: '4. Third-party services',
    body: `We use Supabase for authentication and usage tracking. All AI/OCR processing is done locally on our servers using open-source models — no third-party AI APIs are used for document processing.`,
  },
  {
    title: '5. Your rights',
    body: `You may request deletion of your account and all associated data at any time by emailing hello@handwriteai.com. We will process your request within 30 days.`,
  },
  {
    title: '6. Changes to this policy',
    body: `We may update this policy from time to time. If we make material changes, we will notify you by email or by prominently posting a notice on the site.`,
  },
]

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 pt-16 pb-24 px-6 overflow-hidden">
        <div className="relative max-w-2xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-4">Legal</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-blue-200/70 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      <section className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-10 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-blue-700 leading-relaxed">
            <strong>Short version:</strong> We don&apos;t store your documents. We collect only your email and usage count.
            Your files are processed locally on our server and the results come straight back to your browser. No external AI APIs involved.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="pb-8 border-b border-slate-100 last:border-0">
              <h2 className="text-lg font-bold text-slate-900 mb-3">{section.title}</h2>
              <p className="text-slate-600 leading-relaxed text-sm">{section.body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-10">
          Questions? Email us at{' '}
          <a href="mailto:hello@handwriteai.com" className="text-blue-600 hover:underline">hello@handwriteai.com</a>
        </p>
      </section>

      <Footer />
    </main>
  )
}
