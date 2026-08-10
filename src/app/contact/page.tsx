import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ContactForm from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the HandwriteAI team. We respond to all emails within 24 hours.',
}

export default function Contact() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 pt-16 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-4">Contact</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Get in touch</h1>
          <p className="text-blue-200/80 text-lg">We read every message and respond within 24 hours.</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      <section className="max-w-2xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              ),
              label: 'Email',
              value: 'hello@handwriteai.com',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              ),
              label: 'Response time',
              value: 'Within 24 hours',
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-slate-900">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <ContactForm />
      </section>

      <Footer />
    </main>
  )
}
