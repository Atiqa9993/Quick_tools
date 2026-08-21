'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import HandwritingTool from '@/components/tools/HandwritingTool'
import PdfTool from '@/components/tools/PdfTool'
import ImageToPdfTool from '@/components/tools/ImageToPdfTool'
import BulkOcrTool from '@/components/tools/BulkOcrTool'
import dynamic from 'next/dynamic'
import { allToolsConfig, appCategories, ToolConfig } from '@/lib/toolData'

const CompressPdfTool = dynamic(() => import('@/components/tools/CompressPdfTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const PdfToWordTool = dynamic(() => import('@/components/tools/PdfToWordTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const MergePdfTool = dynamic(() => import('@/components/tools/MergePdfTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const SplitPdfTool = dynamic(() => import('@/components/tools/SplitPdfTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const ImageCompressorTool = dynamic(() => import('@/components/tools/ImageCompressorTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const ImageResizerTool = dynamic(() => import('@/components/tools/ImageResizerTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const RemoveBackgroundTool = dynamic(() => import('@/components/tools/RemoveBackgroundTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const ImageConverterTool = dynamic(() => import('@/components/tools/ImageConverterTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const MergeImagesTool = dynamic(() => import('@/components/tools/MergeImagesTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const ImageToTextTool = dynamic(() => import('@/components/tools/ImageToTextTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const WordCounterTool = dynamic(() => import('@/components/tools/WordCounterTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const CaseConverterTool = dynamic(() => import('@/components/tools/CaseConverterTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const RemoveLineBreaksTool = dynamic(() => import('@/components/tools/RemoveLineBreaksTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const JsonToCsvTool = dynamic(() => import('@/components/tools/JsonToCsvTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const UnitConverterTool = dynamic(() => import('@/components/tools/UnitConverterTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const CurrencyConverterTool = dynamic(() => import('@/components/tools/CurrencyConverterTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

const QrCodeGeneratorTool = dynamic(() => import('@/components/tools/QrCodeGeneratorTool'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
})

/* ── Generic fallback for tools without specific components ── */
function GenericToolUI({ tool }: { tool: ToolConfig }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>{tool.icon}</span>
      </div>
      <h3 className="text-headline-sm text-on-surface mb-2">{tool.name}</h3>
      <p className="text-body-md text-on-surface-variant max-w-md mb-6">
        This tool is currently under active development. Our engineers are working hard to bring you the best {tool.name.toLowerCase()} experience.
      </p>
      <button className="bg-surface-variant text-on-surface-variant px-6 py-2.5 rounded-lg text-label-md font-bold cursor-not-allowed opacity-70">
        Coming Soon
      </button>
    </div>
  )
}

function ToolInterface({ slug, loggedIn, tool }: { slug: string; loggedIn: boolean; tool: ToolConfig }) {
  switch (slug) {
    case 'handwriting-to-text': return <HandwritingTool loggedIn={loggedIn} />
    case 'pdf-to-text':         return <PdfTool loggedIn={loggedIn} />
    case 'image-to-pdf':        return <ImageToPdfTool loggedIn={loggedIn} />
    case 'bulk-ocr':            return <BulkOcrTool loggedIn={loggedIn} />
    case 'compress-pdf':        return <CompressPdfTool loggedIn={loggedIn} />
    case 'pdf-to-word':         return <PdfToWordTool loggedIn={loggedIn} />
    case 'merge-pdf':           return <MergePdfTool loggedIn={loggedIn} />
    case 'split-pdf':           return <SplitPdfTool loggedIn={loggedIn} />
    case 'image-compressor':    return <ImageCompressorTool loggedIn={loggedIn} />
    case 'resize-image':        return <ImageResizerTool loggedIn={loggedIn} />
    case 'background-remover':  return <RemoveBackgroundTool loggedIn={loggedIn} />
    case 'image-converter':     return <ImageConverterTool loggedIn={loggedIn} />
    case 'merge-images':        return <MergeImagesTool loggedIn={loggedIn} />
    case 'image-to-text':        return <ImageToTextTool loggedIn={loggedIn} />
    case 'word-counter':         return <WordCounterTool loggedIn={loggedIn} />
    case 'case-converter':       return <CaseConverterTool loggedIn={loggedIn} />
    case 'remove-line-breaks':   return <RemoveLineBreaksTool loggedIn={loggedIn} />
    case 'json-to-csv':          return <JsonToCsvTool loggedIn={loggedIn} />
    case 'unit-converter':       return <UnitConverterTool loggedIn={loggedIn} />
    case 'currency-converter':   return <CurrencyConverterTool loggedIn={loggedIn} />
    case 'qr-code-generator':    return <QrCodeGeneratorTool loggedIn={loggedIn} />
    default:                    return <GenericToolUI tool={tool} />
  }
}

export default function ToolClient({ slug }: { slug: string }) {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })
  }, [])

  const tool = allToolsConfig[slug]

  /* ── 404 state ── */
  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-6">
        <span className="material-symbols-outlined text-outline-variant mb-4" style={{ fontSize: 48 }}>
          sentiment_dissatisfied
        </span>
        <h1 className="text-headline-md text-on-surface mb-2">Tool not found</h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          The tool &quot;{slug}&quot; doesn&apos;t exist.
        </p>
        <Link href="/" className="text-primary hover:underline font-medium">
          ← Back to all tools
        </Link>
      </div>
    )
  }

  // Find the category to display related tools in the sidebar
  const category = appCategories.find(c => c.label === tool.categoryLabel) || appCategories[0]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex max-w-[1280px] mx-auto min-h-[calc(100vh-64px)]">

        {/* ═══ Left Sidebar ═══ */}
        <aside className="hidden lg:flex flex-col gap-4 py-6 px-4 w-64 sticky top-16 h-[calc(100vh-64px)] bg-surface-container-low border-r border-outline-variant flex-shrink-0">
          <div className="mb-4">
            <h3 className="text-headline-sm text-on-surface">{category.label}</h3>
            <p className="text-label-md text-on-surface-variant mt-1">Related Tools</p>
          </div>
          <nav className="flex flex-col gap-1">
            {category.tools.map(t => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-label-md font-semibold transition-colors ${
                  t.slug === slug
                    ? 'text-primary bg-primary-fixed/20 border-r-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
                <span>{t.name}</span>
              </Link>
            ))}
          </nav>

          {/* Upgrade card */}
          <div className="mt-auto p-4 bg-primary-container text-on-primary-container rounded-xl">
            <p className="text-label-md opacity-90 mb-2">Unlock advanced features</p>
            <Link
              href="/pricing"
              className="block w-full py-2 bg-on-primary-container text-primary rounded-lg text-label-md font-bold text-center hover:opacity-90 transition-all"
            >
              Upgrade to Pro
            </Link>
          </div>
        </aside>

        {/* ═══ Main Content ═══ */}
        <div className="flex-1 px-6 py-10 max-w-4xl mx-auto w-full">

          {/* ── Header ── */}
          <header className="mb-10">
            <div className="flex items-center gap-2 text-primary mb-3">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{tool.categoryIcon}</span>
              <span className="text-label-md uppercase tracking-widest font-bold">{tool.categoryLabel}</span>
              {tool.badge === 'Pro' && (
                <span className="ml-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  PRO
                </span>
              )}
            </div>
            <h1 className="text-headline-lg text-on-background mb-3">{tool.name}</h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl">{tool.desc}</p>
          </header>

          {/* ── Workspace: Tool UI ── */}
          <section className="mb-10">
            <div className="relative border-2 border-dashed border-outline-variant bg-surface-container-lowest rounded-xl p-6 transition-all duration-300 hover:border-primary/40">
              {/* Badge */}
              <div className="absolute top-4 right-4 bg-secondary-container/20 text-secondary-container px-3 py-1 rounded-full flex items-center gap-1.5 z-10">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
                <span className="text-label-md font-bold">Cloud Processing</span>
              </div>

              <div className="pt-4 min-h-[300px] flex flex-col justify-center">
                <ToolInterface slug={slug} loggedIn={loggedIn} tool={tool} />
              </div>

              <p className="mt-4 text-label-md text-outline flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                Files are securely processed and immediately deleted.
              </p>
            </div>
          </section>

          {/* ── Info Grid: Instructions + Benefits ── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

            {/* Quick Instructions */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
              <h3 className="text-headline-sm text-on-background mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>list_alt</span>
                Quick Instructions
              </h3>
              <ul className="space-y-4">
                {tool.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-body-sm text-on-surface-variant">{step.text}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Why use this tool? */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
              <h3 className="text-headline-sm text-on-background mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>psychology</span>
                Why use this tool?
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {tool.benefits.map((b, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: 22 }}>{b.icon}</span>
                    <span className="text-label-md font-bold text-on-background">{b.title}</span>
                    <p className="text-body-sm text-on-surface-variant">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Feature Showcase ── */}
          <section className="mb-10">
            <div className="bg-surface-container-high rounded-2xl overflow-hidden p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2">
                <h4 className="text-headline-md text-on-background mb-3">{tool.showcase.title}</h4>
                <p className="text-body-md text-on-surface-variant mb-5">{tool.showcase.desc}</p>
                <div className="flex gap-3">
                  {tool.showcase.tags.map(tag => (
                    <div key={tag} className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>check_circle</span>
                      <span className="text-label-md">{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:w-1/2 w-full h-48 rounded-xl overflow-hidden relative bg-surface-container flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-primary/20" style={{ fontSize: 100 }}>{tool.icon}</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
