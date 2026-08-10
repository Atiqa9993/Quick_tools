'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

/* ─── Tool Data ─── */
type Tool = {
  slug: string
  icon: string
  name: string
  desc: string
}

type Category = {
  label: string
  icon: string
  tools: Tool[]
}

const categories: Category[] = [
  {
    label: 'PDF Tools',
    icon: 'picture_as_pdf',
    tools: [
      { slug: 'compress-pdf', icon: 'compress', name: 'Compress PDF', desc: 'Reduce file size while optimizing for quality.' },
      { slug: 'pdf-to-word', icon: 'description', name: 'PDF to Word', desc: 'Convert PDF files to editable Word documents.' },
      { slug: 'merge-pdf', icon: 'call_merge', name: 'Merge PDF', desc: 'Combine multiple PDFs into a single file.' },
      { slug: 'split-pdf', icon: 'call_split', name: 'Split PDF', desc: 'Extract pages or split into separate files.' },
      { slug: 'pdf-to-text', icon: 'document_scanner', name: 'OCR PDF', desc: 'Extract text from scanned PDFs instantly using AI.' },
    ],
  },
  {
    label: 'Image Tools',
    icon: 'image',
    tools: [
      { slug: 'image-compressor', icon: 'photo_size_select_small', name: 'Image Compressor', desc: 'Compress PNG, JPG, and SVG without losing quality.' },
      { slug: 'resize-image', icon: 'aspect_ratio', name: 'Resize Image', desc: 'Change image dimensions in pixels or percentage.' },
      { slug: 'background-remover', icon: 'person_remove', name: 'Background Remover', desc: 'AI-powered background removal for photos.' },
      { slug: 'image-converter', icon: 'sync_alt', name: 'Image Converter', desc: 'Convert any image between JPG, PNG, WEBP, GIF, BMP etc.' },
      { slug: 'image-to-text', icon: 'document_scanner', name: 'Image to Text', desc: 'Extract printed & handwritten text from any image using AI.' },
    ],
  },
  {
    label: 'Text Tools',
    icon: 'text_fields',
    tools: [
      { slug: 'word-counter', icon: 'pin', name: 'Word Counter', desc: 'Count words, characters, and reading time.' },
      { slug: 'case-converter', icon: 'format_letter_spacing', name: 'Case Converter', desc: 'Toggle between uppercase, lowercase, and title case.' },
      { slug: 'remove-line-breaks', icon: 'wrap_text', name: 'Remove Line Breaks', desc: 'Clean up text by removing extra spacing and breaks.' },
    ],
  },
  {
    label: 'Converters',
    icon: 'swap_horiz',
    tools: [
      { slug: 'json-to-csv', icon: 'data_object', name: 'JSON to CSV/Excel', desc: 'Convert structured data for spreadsheet software.' },
      { slug: 'unit-converter', icon: 'straighten', name: 'Unit Converter', desc: 'Length, weight, area, and volume conversions.' },
      { slug: 'currency-converter', icon: 'payments', name: 'Currency Converter', desc: 'Real-time exchange rates for global currencies.' },
      { slug: 'qr-code-generator', icon: 'qr_code_2', name: 'QR Code Generator', desc: 'Create custom QR codes for links, text, or WiFi.' },
    ],
  },
]

const allTools = categories.flatMap(c => c.tools)

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCategories = categories
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
    <main className="min-h-screen bg-background text-on-background">
      <Navbar />

      {/* ═══ Hero ═══ */}
      <section className="pt-32 pb-16 container-max text-center">
        <h1
          className="text-on-surface font-extrabold tracking-tight mb-6 mx-auto"
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.75rem)',
            lineHeight: 1.1,
            maxWidth: '48rem',
            textWrap: 'balance',
          }}
        >
          All your everyday tools, in one place
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
          Simple, fast, and free online utilities for professionals and everyday users. No sign-up required.
        </p>

        {/* Search */}
        <div className="max-w-2xl mx-auto relative search-glow group mt-12">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-outline">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>search</span>
          </div>
          <input
            type="text"
            className="w-full h-16 pl-14 pr-6 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-0 text-body-md shadow-sm transition-all outline-none"
            placeholder="Find a tool (e.g., PDF to Word, Image Compressor)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </section>

      {/* ═══ Simple Tools, Serious Privacy ═══ */}
      <section className="bg-surface-container-low py-20 border-t border-outline-variant">
        <div className="container-max grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="lg:pr-12">
            <h2
              className="text-on-surface font-bold tracking-tight mb-6"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.2, textWrap: 'balance' }}
            >
              Simple Tools, Serious Privacy
            </h2>
            <p className="text-body-lg text-on-surface-variant leading-relaxed">
              QuickTools was built on the principle of zero-friction utility. We believe that everyday tasks like compressing an image or converting a PDF should be fast, free, and secure. That&apos;s why our tools process your data directly in your browser—your files never touch our servers.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: 'bolt', label: 'Speed' },
              { icon: 'shield', label: 'Security' },
              { icon: 'auto_awesome', label: 'Simplicity' },
            ].map(item => (
              <div
                key={item.label}
                className="p-8 bg-surface-container-lowest rounded-xl text-center border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center"
              >
                <span className="material-symbols-outlined text-primary mb-3" style={{ fontSize: 32 }}>
                  {item.icon}
                </span>
                <div className="text-label-md text-on-surface font-bold uppercase tracking-wider">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Tool Categories ═══ */}
      <div className="container-max space-y-10 pt-16 pb-24">
        {filteredCategories.map(category => (
          <section key={category.label}>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>
                {category.icon}
              </span>
              <h2 className="text-headline-sm text-on-surface font-bold">
                {category.label}
              </h2>
            </div>

            {/* Tool cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {category.tools.map(tool => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="tool-card group block p-8 bg-surface-container-lowest border border-outline-variant rounded-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-surface-container rounded-lg text-primary">
                      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                        {tool.icon}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors" style={{ fontSize: 20 }}>
                      arrow_forward
                    </span>
                  </div>
                  <h3 className="text-headline-sm text-on-surface mb-1">{tool.name}</h3>
                  <p className="text-body-sm text-on-surface-variant">{tool.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* No results */}
        {filteredCategories.length === 0 && searchTerm && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-outline-variant mb-4" style={{ fontSize: 48 }}>
              search_off
            </span>
            <p className="text-headline-sm text-on-surface mb-2">No tools found</p>
            <p className="text-body-md text-on-surface-variant">
              Try a different search term or browse all categories above.
            </p>
          </div>
        )}
      </div>

      {/* ═══ CTA Section ═══ */}
      <section className="bg-on-surface py-24 text-center relative overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="container-max relative z-10">
          <h2
            className="text-surface font-bold tracking-tight mb-6"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', lineHeight: 1.2, textWrap: 'balance' }}
          >
            Ready to supercharge your workflow?
          </h2>
          <p className="text-body-lg text-surface-variant mb-12 max-w-2xl mx-auto">
            Unlock advanced features, batch processing, and API access with QuickTools Pro.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              href="/pricing"
              className="btn-press bg-primary text-on-primary px-10 py-4 rounded-xl text-label-md transition-all hover:bg-primary-container hover:scale-105 shadow-lg inline-block"
            >
              Upgrade to Pro
            </Link>
            <Link
              href="/pricing"
              className="btn-press border-2 border-surface-variant text-surface px-10 py-4 rounded-xl text-label-md transition-all hover:bg-surface/10 inline-block"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}