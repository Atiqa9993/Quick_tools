import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant">
      <div className="container-max py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">

          {/* Left — Brand */}
          <div>
            <Link href="/" className="text-headline-sm text-primary font-semibold mb-2 inline-block">
              QuickTools
            </Link>
            <p className="text-body-sm text-on-surface-variant">
              © {new Date().getFullYear()} QuickTools. All rights reserved.
            </p>
          </div>

          {/* Center — Links */}
          <nav className="flex flex-wrap items-center gap-6">
            <Link href="/" className="text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Tools
            </Link>
            <Link href="/pricing" className="text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link href="/privacy" className="text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right — Social */}
          <div className="flex gap-3">
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors"
              aria-label="Website"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>language</span>
            </a>
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors"
              aria-label="Share"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>share</span>
            </a>
          </div>

        </div>
      </div>
    </footer>
  )
}