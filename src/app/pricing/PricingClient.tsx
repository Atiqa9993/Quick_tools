'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const faqs = [
  {
    q: "Is my data safe?",
    a: "Absolutely. Most of our tools use browser-side processing, meaning your files never even leave your computer. For tools that require server processing (Pro Plan), we use encrypted channels and auto-delete all files 1 hour after processing."
  },
  {
    q: "How does browser-side processing work?",
    a: "We utilize WebAssembly (WASM) and Modern JS APIs to run processing logic directly in your browser. This makes the tools extremely fast, private, and works even when you're offline once the tool is loaded."
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, there are no long-term contracts. You can cancel your Pro subscription at any time from your account dashboard with a single click. You'll maintain access until the end of your billing period."
  }
]

export default function PricingClient() {
  const [isYearly, setIsYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans transition-colors duration-300">
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="py-12 md:py-16 text-center px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-extrabold text-on-surface leading-tight tracking-tight mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-on-surface-variant mb-8 leading-relaxed">
              Start for free, upgrade when you grow.
            </p>

            {/* Billing Toggle */}
            <div className="flex justify-center items-center gap-4 mb-8">
              <span className={`text-base font-medium transition-colors ${!isYearly ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className="relative w-14 h-7 bg-surface-container-highest rounded-full transition-colors focus:outline-none ring-2 ring-transparent focus:ring-primary/20 cursor-pointer"
                aria-label="Toggle Billing Period"
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-primary rounded-full transition-transform duration-300 ${
                    isYearly ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-base font-medium transition-colors ${isYearly ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                Yearly
              </span>
              <span className="bg-surface-container-low text-primary text-xs font-bold px-2.5 py-1 rounded-full border border-primary/10">
                Save 20%
              </span>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-6 pb-16">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-1">
              <div>
                <h3 className="text-xl font-bold text-on-surface mb-1">Free Plan</h3>
                <p className="text-sm text-on-surface-variant mb-6">Perfect for occasional utility needs.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl md:text-5xl font-black text-on-surface">$0</span>
                  <span className="text-on-surface-variant text-sm font-medium">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Browser-side processing',
                    'No sign-up required',
                    'Max 50MB file size',
                    '10 tools per day',
                    'Basic support',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-on-surface">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                        check_circle
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/"
                className="w-full py-3 border border-outline text-on-surface font-semibold rounded-lg text-center hover:bg-surface-container-low transition-all active:scale-95 block"
              >
                Start for Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="relative bg-surface-container-lowest border-2 border-primary rounded-2xl p-8 shadow-md flex flex-col justify-between transition-transform hover:-translate-y-1">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[12px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Most Popular
              </div>
              <div>
                <h3 className="text-xl font-bold text-on-surface mb-1">Pro Plan</h3>
                <p className="text-sm text-on-surface-variant mb-6">For power users and professionals.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl md:text-5xl font-black text-on-surface transition-all">
                    {isYearly ? '$9.60' : '$12'}
                  </span>
                  <span className="text-on-surface-variant text-sm font-medium">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                      check_circle
                    </span>
                    Unlimited daily tools
                  </li>
                  <li className="flex items-center gap-3 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                      check_circle
                    </span>
                    Up to 2GB file size
                  </li>
                  <li className="flex items-center gap-3 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                      check_circle
                    </span>
                    Priority WASM processing
                  </li>
                  <li className="flex items-center gap-3 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                      check_circle
                    </span>
                    Batch processing (zip uploads)
                  </li>
                  <li className="flex items-center gap-3 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                      check_circle
                    </span>
                    Developer API access{' '}
                    <span className="text-[10px] bg-surface-container-high text-primary px-1.5 py-0.5 rounded font-bold ml-1">
                      EARLY ACCESS
                    </span>
                  </li>
                  <li className="flex items-center gap-3 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                      check_circle
                    </span>
                    24/7 Priority support
                  </li>
                </ul>
              </div>
              <Link
                href="/auth"
                className="w-full py-3 bg-primary text-on-primary font-semibold rounded-lg text-center shadow-sm hover:opacity-90 transition-all active:scale-95 block"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-surface-container-low py-16 px-6 rounded-3xl max-w-6xl mx-auto my-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-center text-2xl md:text-3xl font-bold text-on-surface mb-10">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index
                return (
                  <div
                    key={index}
                    className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden transition-shadow shadow-sm hover:shadow-md"
                  >
                    <button
                      className="w-full p-6 flex justify-between items-center text-left hover:bg-surface-container-low transition-colors"
                      onClick={() => toggleFaq(index)}
                    >
                      <span className="font-bold text-base text-on-surface">{faq.q}</span>
                      <span
                        className={`material-symbols-outlined transition-transform duration-300 ${
                          isOpen ? 'rotate-180 text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 text-sm text-on-surface-variant leading-relaxed border-t border-outline-variant/20 pt-4">
                        {faq.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-12 px-6 text-center">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs text-outline mb-8 uppercase tracking-widest font-bold">
              Trusted by developers at
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-40 grayscale">
              <div className="h-8 w-24 bg-on-surface-variant/20 rounded-lg"></div>
              <div className="h-8 w-32 bg-on-surface-variant/20 rounded-lg"></div>
              <div className="h-8 w-28 bg-on-surface-variant/20 rounded-lg"></div>
              <div className="h-8 w-20 bg-on-surface-variant/20 rounded-lg"></div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
