import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'HandwriteAI Terms and Conditions — acceptable use, subscription terms, and your rights.',
}

const sections = [
  {
    title: '1. Acceptance of terms',
    body: 'By creating an account or using any HandwriteAI tool, you agree to these Terms. If you do not agree, please do not use our services.',
  },
  {
    title: '2. Free plan limits',
    body: 'Free accounts are limited to 5 document pages per day. Attempting to circumvent this limit through technical means (e.g., creating multiple accounts) is prohibited and may result in account suspension.',
  },
  {
    title: '3. Pro subscriptions',
    body: 'Pro subscriptions are billed monthly. You may cancel at any time. Cancellation takes effect at the end of your current billing period — you will retain Pro access until then. We do not offer refunds for partial months.',
  },
  {
    title: '4. Acceptable use',
    body: 'You may use HandwriteAI for lawful purposes only. You may not use our services to process documents you do not own or have permission to digitize, to infringe copyright, or to engage in any illegal activity.',
  },
  {
    title: '5. Intellectual property',
    body: 'The text extracted from your documents belongs to you. HandwriteAI claims no ownership over the content of files you process. Our software, brand, and design remain our intellectual property.',
  },
  {
    title: '6. Limitation of liability',
    body: 'HandwriteAI is provided "as is" without warranties of any kind. We are not liable for errors in OCR output, data loss, or any consequential damages arising from use of our service.',
  },
  {
    title: '7. Changes to these terms',
    body: 'We may update these terms at any time. Continued use of the service after changes constitutes acceptance. We will email users about material changes.',
  },
]

export default function Terms() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 pt-16 pb-24 px-6 overflow-hidden">
        <div className="relative max-w-2xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-4">Legal</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Terms &amp; Conditions</h1>
          <p className="text-blue-200/70 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      <section className="max-w-2xl mx-auto px-6 py-16">
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
