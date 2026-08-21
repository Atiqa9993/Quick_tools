'use client'

import { useState } from 'react'
import Link from 'next/link'
import { appCategories } from '@/lib/toolData'

/* ─── All tools flattened for search ─── */
const allCats = appCategories

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('All')

  const categoryLabels = ['All', ...appCategories.map(c => c.label)]

  const filteredCategories = allCats
    .filter(cat => activeFilter === 'All' || cat.label === activeFilter)
    .map(cat => ({
      ...cat,
      tools: cat.tools.filter(
        t =>
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.desc.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter(cat => cat.tools.length > 0)

  return (
    <div className="min-h-screen bg-background text-on-background">

      {/* ═══════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════ */}
      <section className="pt-28 pb-16 px-6 text-center relative overflow-hidden">
        {/* Subtle background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -top-20 right-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-primary/8 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-label-md font-bold mb-6">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
            21+ Free Online Tools
          </div>

          <h1
            className="text-on-surface font-extrabold tracking-tight mb-6"
            style={{
              fontSize: 'clamp(2.2rem, 5.5vw, 4rem)',
              lineHeight: 1.1,
              textWrap: 'balance',
            }}
          >
            All your everyday tools,{' '}
            <span className="text-primary">in one place</span>
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
            Simple, fast, and free online utilities for professionals and everyday users.
            PDF tools, image tools, text &amp; OCR, converters — all in your browser. No sign-up required.
          </p>

          {/* ── Search Bar ── */}
          <div className="max-w-2xl mx-auto relative search-glow">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>search</span>
            </div>
            <input
              id="tool-search"
              type="text"
              className="w-full h-16 pl-14 pr-6 rounded-2xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-0 text-body-md shadow-sm transition-all outline-none"
              placeholder="Find a tool (e.g. compress PDF, remove background)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* ── Stats Row ── */}
          <div className="flex flex-wrap justify-center gap-8 mt-10">
            {[
              { icon: 'bolt', label: '21 Tools', sub: 'and growing' },
              { icon: 'shield', label: '100% Private', sub: 'files stay in browser' },
              { icon: 'payments', label: 'Totally Free', sub: 'no sign-up needed' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>{stat.icon}</span>
                </div>
                <div className="text-left">
                  <div className="text-label-md font-bold text-on-surface">{stat.label}</div>
                  <div className="text-[11px] text-on-surface-variant">{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CATEGORY FILTER PILLS
          ═══════════════════════════════════════════════ */}
      <div className="sticky top-16 z-30 bg-background/90 backdrop-blur-md border-b border-outline-variant/40 shadow-sm">
        <div className="container-max">
          <div className="flex items-center gap-2 overflow-x-auto py-3 hide-scrollbar">
            {categoryLabels.map(label => {
              const cat = appCategories.find(c => c.label === label)
              const icon = cat?.icon ?? 'apps'
              const isActive = activeFilter === label
              return (
                <button
                  key={label}
                  onClick={() => { setActiveFilter(label); setSearchTerm('') }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap text-label-md font-bold border transition-all shrink-0 ${
                    isActive
                      ? 'bg-primary text-on-primary border-primary shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{icon}</span>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          TOOL GRID
          ═══════════════════════════════════════════════ */}
      <div className="container-max pt-12 pb-24 space-y-14">
        {filteredCategories.map(category => (
          <section key={category.label} className="animate-fade-in-up">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                  {category.icon}
                </span>
              </div>
              <div>
                <h2 className="text-headline-sm text-on-surface font-bold leading-none">
                  {category.label}
                </h2>
                <p className="text-label-md text-on-surface-variant mt-0.5">
                  {category.tools.length} tool{category.tools.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex-1 h-px bg-outline-variant/50 ml-2 hidden sm:block" />
            </div>

            {/* Tool Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {category.tools.map(tool => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="tool-card group block p-6 bg-surface-container-lowest border border-outline-variant rounded-2xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                        {tool.icon}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {tool.badge === 'Pro' && (
                        <span className="bg-gradient-to-r from-orange-500 to-amber-400 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                          PRO
                        </span>
                      )}
                      <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors" style={{ fontSize: 18 }}>
                        arrow_forward
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <h3 className="text-label-md font-bold text-on-surface mb-1.5 group-hover:text-primary transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed line-clamp-2">
                    {tool.desc}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* ── No Results ── */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-outline-variant mb-4" style={{ fontSize: 52 }}>
              search_off
            </span>
            <p className="text-headline-sm text-on-surface mb-2">No tools found</p>
            <p className="text-body-md text-on-surface-variant mb-6">
              Try a different keyword or browse a category above.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setActiveFilter('All') }}
              className="text-primary font-bold hover:underline text-label-md"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          VALUE PROPS SECTION
          ═══════════════════════════════════════════════ */}
      <section className="bg-surface-container-low border-t border-outline-variant py-20">
        <div className="container-max grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2
              className="text-on-surface font-bold tracking-tight mb-5"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', lineHeight: 1.2, textWrap: 'balance' }}
            >
              Simple Tools, Serious Privacy
            </h2>
            <p className="text-body-lg text-on-surface-variant leading-relaxed mb-6">
              QuickTools was built on the principle of zero-friction utility. Every task — compressing an image,
              converting a PDF, or generating a QR code — happens directly in your browser.
              Your files never touch our servers.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-primary font-bold text-label-md hover:underline"
            >
              Learn about our privacy principles
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: 'bolt',          label: 'Speed',      desc: 'Instant results with no server round-trips.' },
              { icon: 'shield',        label: 'Security',   desc: 'Files processed locally, never uploaded.' },
              { icon: 'auto_awesome',  label: 'Simplicity', desc: 'No sign-up, no tracking, no nonsense.' },
            ].map(item => (
              <div
                key={item.label}
                className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
              >
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>
                  {item.icon}
                </span>
                <div>
                  <div className="text-label-md text-on-surface font-bold uppercase tracking-wider mb-1">
                    {item.label}
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA SECTION
          ═══════════════════════════════════════════════ */}
      <section className="bg-on-surface py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="container-max relative z-10">
          <h2
            className="text-surface font-bold tracking-tight mb-5"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', lineHeight: 1.2, textWrap: 'balance' }}
          >
            Ready to supercharge your workflow?
          </h2>
          <p className="text-body-lg text-surface-variant mb-10 max-w-2xl mx-auto">
            Unlock advanced features, batch processing, and API access with QuickTools Pro.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/pricing"
              className="btn-press bg-primary text-on-primary px-10 py-4 rounded-xl text-label-md font-bold transition-all hover:bg-primary-container hover:scale-105 shadow-lg inline-block"
            >
              Upgrade to Pro
            </Link>
            <Link
              href="/pricing"
              className="btn-press border-2 border-surface-variant/40 text-surface px-10 py-4 rounded-xl text-label-md font-bold transition-all hover:bg-surface/10 inline-block"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}