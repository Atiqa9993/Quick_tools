'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const [email, setEmail] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email || '')
    })
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const toggleDarkMode = () => {
    const active = document.documentElement.classList.toggle('dark')
    setIsDark(active)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface dark:bg-surface-dim shadow-sm border-b border-outline-variant/30 transition-colors duration-300">
      <div className="flex justify-between items-center h-16 px-6 sm:px-8 lg:px-12 max-w-container-max mx-auto w-full">
        {/* Logo & Desktop Nav */}
        <div className="flex items-center gap-6 xl:gap-8">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-primary shrink-0 flex items-center">
            QuickTools
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 whitespace-nowrap">
            {/* PDF Tools Dropdown */}
            <div className="relative group nav-item">
              <button className="flex items-center gap-1 text-on-surface-variant group-hover:text-primary transition-colors duration-200 text-[12px] xl:text-[13px] font-semibold uppercase tracking-wider py-2">
                PDF Tools
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
              <div className="mega-menu absolute top-full left-0 pt-2 w-[260px]">
                <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant p-5 space-y-3">
                  <Link href="/tools/compress-pdf" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">compress</span>
                    <span className="font-semibold text-on-surface">Compress PDF</span>
                  </Link>
                  <Link href="/tools/pdf-to-word" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">description</span>
                    <span className="font-semibold text-on-surface">PDF to Word</span>
                  </Link>
                  <Link href="/tools/merge-pdf" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">call_merge</span>
                    <span className="font-semibold text-on-surface">Merge PDF</span>
                  </Link>
                  <Link href="/tools/split-pdf" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">call_split</span>
                    <span className="font-semibold text-on-surface">Split PDF</span>
                  </Link>
                  <Link href="/tools/pdf-to-text" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">document_scanner</span>
                    <span className="font-semibold text-on-surface">OCR PDF</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Image Tools Dropdown */}
            <div className="relative group nav-item">
              <button className="flex items-center gap-1 text-on-surface-variant group-hover:text-primary transition-colors duration-200 text-[12px] xl:text-[13px] font-semibold uppercase tracking-wider py-2">
                Image Tools
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
              <div className="mega-menu absolute top-full left-0 pt-2 w-[260px]">
                <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant p-5 space-y-3">
                  <Link href="/tools/image-compressor" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">photo_size_select_small</span>
                    <span className="font-semibold text-on-surface">Image Compressor</span>
                  </Link>
                  <Link href="/tools/resize-image" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">aspect_ratio</span>
                    <span className="font-semibold text-on-surface">Resize Image</span>
                  </Link>
                  <Link href="/tools/background-remover" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">person_remove</span>
                    <span className="font-semibold text-on-surface">Background Remover</span>
                  </Link>
                  <Link href="/tools/image-converter" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">sync_alt</span>
                    <span className="font-semibold text-on-surface">Image Converter</span>
                  </Link>
                  <Link href="/tools/image-to-text" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">document_scanner</span>
                    <span className="font-semibold text-on-surface">Image to Text (OCR)</span>
                  </Link>
                  <Link href="/tools/image-to-pdf" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">imagesmode</span>
                    <span className="font-semibold text-on-surface">Image to PDF</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Text & OCR Dropdown */}
            <div className="relative group nav-item">
              <button className="flex items-center gap-1 text-on-surface-variant group-hover:text-primary transition-colors duration-200 text-[12px] xl:text-[13px] font-semibold uppercase tracking-wider py-2">
                Text & OCR
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
              <div className="mega-menu absolute top-full left-0 pt-2 w-[240px]">
                <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant p-5 space-y-3">
                  <Link href="/tools/word-counter" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">pin</span>
                    <span className="font-semibold text-on-surface">Word Counter</span>
                  </Link>
                  <Link href="/tools/case-converter" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">format_letter_spacing</span>
                    <span className="font-semibold text-on-surface">Case Converter</span>
                  </Link>
                  <Link href="/tools/remove-line-breaks" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">wrap_text</span>
                    <span className="font-semibold text-on-surface">Remove Line Breaks</span>
                  </Link>
                  <Link href="/tools/bulk-ocr" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">inventory_2</span>
                    <span className="font-semibold text-on-surface">Bulk OCR</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Converters Dropdown */}
            <div className="relative group nav-item">
              <button className="flex items-center gap-1 text-on-surface-variant group-hover:text-primary transition-colors duration-200 text-[12px] xl:text-[13px] font-semibold uppercase tracking-wider py-2">
                Converters
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
              <div className="mega-menu absolute top-full left-0 pt-2 w-[240px]">
                <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant p-5 space-y-3">
                  <Link href="/tools/json-to-csv" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">data_object</span>
                    <span className="font-semibold text-on-surface">JSON to CSV</span>
                  </Link>
                  <Link href="/tools/unit-converter" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">straighten</span>
                    <span className="font-semibold text-on-surface">Unit Converter</span>
                  </Link>
                  <Link href="/tools/currency-converter" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">payments</span>
                    <span className="font-semibold text-on-surface">Currency Converter</span>
                  </Link>
                  <Link href="/tools/qr-code-generator" className="flex items-center gap-3 text-body-sm hover:text-primary group/item">
                    <span className="material-symbols-outlined text-primary/70 group-hover/item:text-primary text-[18px]">qr_code_2</span>
                    <span className="font-semibold text-on-surface">QR Code Generator</span>
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/" className="text-on-surface-variant hover:text-primary transition-colors duration-200 text-[12px] xl:text-[13px] font-semibold uppercase tracking-wider">
              All Tools
            </Link>

            <Link href="/pricing" className="text-on-surface-variant hover:text-primary transition-colors duration-200 text-[12px] xl:text-[13px] font-semibold uppercase tracking-wider">
              Pricing
            </Link>
          </nav>
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant cursor-pointer"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <div className="hidden md:block w-px h-6 bg-outline-variant/50"></div>

          <div className="relative group nav-item hidden md:block">
            {email ? (
              <button className="flex items-center justify-center px-4 h-9 rounded-full bg-surface-container-highest text-on-surface-variant overflow-hidden border border-outline-variant hover:border-primary transition-colors text-label-md font-bold truncate max-w-[150px]">
                {email.split('@')[0]}
              </button>
            ) : (
              <Link href="/auth" className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-highest text-on-surface-variant overflow-hidden border border-outline-variant hover:border-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </Link>
            )}
            
            {/* User Dropdown */}
            {email && (
              <div className="mega-menu absolute top-full right-0 pt-4 w-[200px]">
                <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant p-2 flex flex-col">
                  <div className="px-4 py-3 border-b border-outline-variant/30 mb-2">
                    <p className="text-label-md text-on-surface-variant truncate">{email}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2 text-body-sm text-error hover:bg-error-container/30 rounded-lg transition-colors text-left font-semibold"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className="material-symbols-outlined text-[24px]">
              {menuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden border-t border-outline-variant/30 bg-surface px-6 py-4 flex flex-col gap-1 max-h-[80vh] overflow-y-auto">
          <Link href="/" className="px-4 py-3 rounded-lg text-body-sm font-semibold transition-colors text-on-surface-variant hover:text-primary hover:bg-surface-container-high">
            All Tools
          </Link>
          <Link href="/pricing" className="px-4 py-3 rounded-lg text-body-sm font-semibold transition-colors text-on-surface-variant hover:text-primary hover:bg-surface-container-high">
            Pricing
          </Link>
          <Link href="/about" className="px-4 py-3 rounded-lg text-body-sm font-semibold transition-colors text-on-surface-variant hover:text-primary hover:bg-surface-container-high">
            About
          </Link>
          
          <div className="border-t border-outline-variant/30 mt-4 pt-4">
            {email ? (
              <div className="flex flex-col gap-2">
                <span className="text-label-md text-on-surface-variant px-4">{email}</span>
                <button
                  onClick={handleLogout}
                  className="text-left px-4 py-3 rounded-lg text-body-sm text-error hover:bg-error-container/30 font-semibold transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-3 rounded-xl text-label-md font-bold transition-transform active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}