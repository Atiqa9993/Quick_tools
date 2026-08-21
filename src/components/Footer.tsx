import Link from 'next/link'

/* ─────────────────────────────────────────────────────────────────────────────
   Multi-Column Directory Footer — QuickTools
   Professional 4-column layout: Brand · PDF Tools · Image Suite · Company
   ───────────────────────────────────────────────────────────────────────────── */

const footerSections = [
  {
    title: 'PDF Utilities',
    links: [
      { label: 'Compress PDF',   href: '/tools/compress-pdf' },
      { label: 'PDF to Word',    href: '/tools/pdf-to-word' },
      { label: 'Merge PDF',      href: '/tools/merge-pdf' },
      { label: 'Split PDF',      href: '/tools/split-pdf' },
      { label: 'OCR PDF',        href: '/tools/pdf-to-text' },
    ],
  },
  {
    title: 'Image Suite',
    links: [
      { label: 'Image Compressor',   href: '/tools/image-compressor' },
      { label: 'Resize Image',       href: '/tools/resize-image' },
      { label: 'Background Remover', href: '/tools/background-remover' },
      { label: 'Image Converter',    href: '/tools/image-converter' },
      { label: 'Merge Images',       href: '/tools/merge-images' },
      { label: 'Image to Text',      href: '/tools/image-to-text' },
    ],
  },
  {
    title: 'Text & Converters',
    links: [
      { label: 'Word Counter',       href: '/tools/word-counter' },
      { label: 'Case Converter',     href: '/tools/case-converter' },
      { label: 'QR Code Generator',  href: '/tools/qr-code-generator' },
      { label: 'JSON to CSV',        href: '/tools/json-to-csv' },
      { label: 'Unit Converter',     href: '/tools/unit-converter' },
      { label: 'Currency Converter', href: '/tools/currency-converter' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'All Tools',      href: '/' },
      { label: 'Pricing',        href: '/pricing' },
      { label: 'About',          href: '/about' },
      { label: 'Contact',        href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use',   href: '/terms' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant">
      {/* ── Top Section: Multi-Column Directory ── */}
      <div className="container-max pt-16 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 lg:gap-12">

          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <Link href="/" className="text-headline-sm text-primary font-bold inline-block mb-3">
              QuickTools
            </Link>
            <p className="text-body-sm text-on-surface-variant leading-relaxed max-w-xs">
              Simple, fast, and free online utilities for professionals and everyday users. No sign-up required.
            </p>
            {/* Social Row */}
            <div className="flex gap-2 mt-5">
              <a
                href="https://github.com/Atiqa9993/Quick_tools"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition-all"
                aria-label="GitHub"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>code</span>
              </a>
              <a
                href="#"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition-all"
                aria-label="Share"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>share</span>
              </a>
              <a
                href="mailto:contact@quicktools.dev"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition-all"
                aria-label="Email"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>mail</span>
              </a>
            </div>
          </div>

          {/* Directory Columns */}
          {footerSections.map(section => (
            <div key={section.title}>
              <h4 className="text-label-md text-on-surface font-bold uppercase tracking-wider mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="border-t border-outline-variant/50">
        <div className="container-max py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-label-md text-on-surface-variant">
            © {new Date().getFullYear()} QuickTools. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>verified_user</span>
            <span>Your files never leave your browser</span>
          </div>
        </div>
      </div>
    </footer>
  )
}