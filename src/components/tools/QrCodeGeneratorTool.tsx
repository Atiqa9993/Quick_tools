'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'

/* ─────────────────────────────────────────────────────────────────────────────
   TOP 6 HIGH-DEMAND CATEGORIES ONLY
   ───────────────────────────────────────────────────────────────────────────── */
const MAIN_TABS = [
  { key: 'url',      label: 'URL / Link',      icon: 'link',          placeholder: 'https://example.com' },
  { key: 'text',     label: 'Text',            icon: 'notes',         placeholder: 'Enter your text or message...' },
  { key: 'whatsapp', label: 'WhatsApp',        icon: 'chat',          placeholder: '+92 300 1234567' },
  { key: 'social',   label: 'Social Media',    icon: 'share',         placeholder: '@username or profile URL' },
  { key: 'wifi',     label: 'WiFi',            icon: 'wifi',          placeholder: 'MyNetwork' },
  { key: 'file',     label: 'File / PDF',      icon: 'picture_as_pdf',placeholder: 'https://drive.google.com/file/d/...' },
]

/* ── Color Presets ── */
const COLOR_PRESETS = [
  { name: 'Classic Black', fg: '#000000', bg: '#ffffff' },
  { name: 'Ocean Blue',   fg: '#0ea5e9', bg: '#ffffff' },
  { name: 'Emerald Green',fg: '#10b981', bg: '#ffffff' },
  { name: 'Crimson Red',  fg: '#ef4444', bg: '#ffffff' },
  { name: 'Royal Purple', fg: '#8b5cf6', bg: '#ffffff' },
  { name: 'Midnight Dark',fg: '#f8fafc', bg: '#0f172a' },
]

/* ── Frame Templates ── */
const FRAME_TEMPLATES = [
  { id: 'none',     label: 'No Frame' },
  { id: 'simple',   label: 'Border' },
  { id: 'scanme',   label: 'SCAN ME' },
  { id: 'badge',    label: 'Badge Header' },
]

/* ── Resolution Options ── */
const RESOLUTION_OPTIONS = [
  { label: '500 x 500 px',  value: 500 },
  { label: '1000 x 1000 px', value: 1000 },
  { label: '2000 x 2000 px', value: 2000 },
]

export default function QrCodeGeneratorTool({ loggedIn }: { loggedIn?: boolean }) {
  // Top level active tab
  const [activeTab, setActiveTab] = useState<string>('url')

  // Form Fields per tab
  const [fields, setFields] = useState<Record<string, string>>({ url: '' })

  // Customization Accordion State
  const [activeAccordion, setActiveAccordion] = useState<'content' | 'customize'>('content')
  const [activeSubTab, setActiveSubTab] = useState<'colors' | 'frame' | 'logo'>('colors')

  // Color Controls
  const [fgColor, setFgColor] = useState<string>('#000000')
  const [bgColor, setBgColor] = useState<string>('#ffffff')

  // Frame Option
  const [frameStyle, setFrameStyle] = useState<string>('none')
  const [frameText, setFrameText] = useState<string>('SCAN ME')

  // Logo Upload
  const [logoSrc, setLogoSrc] = useState<string | null>(null)

  // Download Config
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'svg'>('png')
  const [downloadSize, setDownloadSize] = useState<number>(1000)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const svgContainerRef = useRef<HTMLDivElement | null>(null)

  // Field updater
  const updateField = (key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    setFields({})
  }

  // Construct target QR payload
  const getQrValue = (): string => {
    switch (activeTab) {
      case 'url':
        return fields.url || ''
      case 'text':
        return fields.text || ''
      case 'whatsapp': {
        const phone = (fields.phone || '').replace(/[^0-9]/g, '')
        const msg = fields.message ? `?text=${encodeURIComponent(fields.message)}` : ''
        return phone ? `https://wa.me/${phone}${msg}` : ''
      }
      case 'social': {
        const val = fields.socialVal || ''
        if (val.startsWith('http')) return val
        if (fields.platform === 'instagram') return `https://instagram.com/${val.replace('@', '')}`
        if (fields.platform === 'youtube') return `https://youtube.com/${val}`
        return val
      }
      case 'wifi': {
        const ssid = fields.ssid || ''
        const pass = fields.password || ''
        const enc = fields.encryption || 'WPA'
        return ssid ? `WIFI:T:${enc};S:${ssid};P:${pass};;` : ''
      }
      case 'file':
        return fields.fileUrl || ''
      default:
        return ''
    }
  }

  const qrValue = getQrValue()
  const isValid = qrValue.trim().length > 0

  // Logo file upload handler
  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo image should be less than 2MB.')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        setLogoSrc(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // High quality Download Handler
  const handleDownload = () => {
    if (!isValid) return

    if (downloadFormat === 'png') {
      const canvas = canvasRef.current
      if (!canvas) return

      // Draw high resolution export
      const link = document.createElement('a')
      link.download = `qrcode_${activeTab}_${downloadSize}x${downloadSize}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    } else {
      // SVG Download
      const svgElement = svgContainerRef.current?.querySelector('svg')
      if (!svgElement) return

      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)

      const link = document.createElement('a')
      link.download = `qrcode_${activeTab}.svg`
      link.href = svgUrl
      link.click()
      URL.revokeObjectURL(svgUrl)
    }
  }

  // Render input fields according to active tab
  const renderTabInputs = () => {
    const inputClass = "w-full bg-surface-container rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/40"
    const labelClass = "text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block"

    switch (activeTab) {
      case 'url':
        return (
          <div>
            <label className={labelClass}>Website URL / Link</label>
            <input
              type="url"
              value={fields.url || ''}
              onChange={e => updateField('url', e.target.value)}
              placeholder="https://yourwebsite.com"
              className={inputClass}
              autoFocus
            />
          </div>
        )
      case 'text':
        return (
          <div>
            <label className={labelClass}>Plain Text Content</label>
            <textarea
              value={fields.text || ''}
              onChange={e => updateField('text', e.target.value)}
              placeholder="Enter text, serial code, or any custom message..."
              className={`${inputClass} min-h-[110px] resize-y`}
              autoFocus
            />
          </div>
        )
      case 'whatsapp':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>WhatsApp Number (with country code)</label>
              <input
                type="tel"
                value={fields.phone || ''}
                onChange={e => updateField('phone', e.target.value)}
                placeholder="+923001234567"
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>Pre-filled Message (optional)</label>
              <textarea
                value={fields.message || ''}
                onChange={e => updateField('message', e.target.value)}
                placeholder="Hello, I would like to inquire about..."
                className={`${inputClass} min-h-[80px] resize-y`}
              />
            </div>
          </div>
        )
      case 'social':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Platform</label>
              <select
                value={fields.platform || 'instagram'}
                onChange={e => updateField('platform', e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="custom">Custom Link / Handle</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Profile Link or Username</label>
              <input
                type="text"
                value={fields.socialVal || ''}
                onChange={e => updateField('socialVal', e.target.value)}
                placeholder={fields.platform === 'youtube' ? 'https://youtube.com/@channel' : '@username'}
                className={inputClass}
                autoFocus
              />
            </div>
          </div>
        )
      case 'wifi':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Network Name (SSID)</label>
              <input
                type="text"
                value={fields.ssid || ''}
                onChange={e => updateField('ssid', e.target.value)}
                placeholder="Home_WiFi_5G"
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                value={fields.password || ''}
                onChange={e => updateField('password', e.target.value)}
                placeholder="WiFi Password"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Network Security</label>
              <select
                value={fields.encryption || 'WPA'}
                onChange={e => updateField('encryption', e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="WPA">WPA / WPA2 / WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">No Password (Open)</option>
              </select>
            </div>
          </div>
        )
      case 'file':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>PDF / Document Share Link</label>
              <input
                type="url"
                value={fields.fileUrl || ''}
                onChange={e => updateField('fileUrl', e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className={inputClass}
                autoFocus
              />
            </div>
            <p className="text-xs text-on-surface-variant/70">
              Paste a public Google Drive, Dropbox, or PDF cloud link to generate your PDF QR code.
            </p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── 1. TOP TABS NAVIGATION (6 HIGH-DEMAND CATEGORIES) ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-2 shadow-sm">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MAIN_TABS.map(t => {
            const isActive = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl transition-all font-bold text-xs ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-md shadow-primary/20 scale-[1.02]'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── SPLIT LAYOUT ARCHITECTURE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── 2. LEFT COLUMN: ADD CONTENT & CUSTOMIZE ── */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* CONTENT STEP CONTAINER */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
                Add {MAIN_TABS.find(t => t.key === activeTab)?.label} Content
              </h2>
              <span className="text-xs font-semibold text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/20">
                Live Sync
              </span>
            </div>
            {renderTabInputs()}
          </div>

          {/* ELEGANT CUSTOMIZE ACCORDION */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
                Customize QR Design
              </h2>
              
              {/* SUB TABS NAVIGATION */}
              <div className="flex bg-surface-container rounded-xl p-1 gap-1 border border-outline-variant">
                <button
                  onClick={() => { setActiveAccordion('customize'); setActiveSubTab('colors'); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === 'colors' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Colors
                </button>
                <button
                  onClick={() => { setActiveAccordion('customize'); setActiveSubTab('frame'); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === 'frame' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Frame
                </button>
                <button
                  onClick={() => { setActiveAccordion('customize'); setActiveSubTab('logo'); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === 'logo' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Logo
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* SUB TAB: COLORS & GRADIENTS */}
              {activeSubTab === 'colors' && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                      Color Presets
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                      {COLOR_PRESETS.map((preset, i) => (
                        <button
                          key={i}
                          onClick={() => { setFgColor(preset.fg); setBgColor(preset.bg); }}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                            fgColor === preset.fg && bgColor === preset.bg
                              ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                              : 'border-outline-variant hover:bg-surface-container'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full border border-outline-variant flex overflow-hidden shadow-inner">
                            <div className="w-1/2 h-full" style={{ backgroundColor: preset.fg }}></div>
                            <div className="w-1/2 h-full" style={{ backgroundColor: preset.bg }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-on-surface-variant truncate w-full text-center">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-surface-container rounded-xl p-3 border border-outline-variant flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">Foreground</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={fgColor}
                          onChange={e => setFgColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-xs font-mono text-on-surface-variant uppercase">{fgColor}</span>
                      </div>
                    </div>
                    <div className="bg-surface-container rounded-xl p-3 border border-outline-variant flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">Background</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={e => setBgColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-xs font-mono text-on-surface-variant uppercase">{bgColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB: FRAME TEMPLATES */}
              {activeSubTab === 'frame' && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                      Frame Template
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {FRAME_TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setFrameStyle(t.id)}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all font-bold text-xs ${
                            frameStyle === t.id
                              ? 'border-primary bg-primary/5 text-primary shadow-xs'
                              : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-2xl">
                            {t.id === 'none' ? 'crop_free' : t.id === 'scanme' ? 'label' : 'border_style'}
                          </span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {frameStyle !== 'none' && (
                    <div className="pt-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                        Frame Text
                      </label>
                      <input
                        type="text"
                        value={frameText}
                        onChange={e => setFrameText(e.target.value)}
                        placeholder="SCAN ME"
                        className="w-full bg-surface-container rounded-xl border border-outline-variant px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SUB TAB: LOGO UPLOAD */}
              {activeSubTab === 'logo' && (
                <div className="space-y-4 animate-fadeIn">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                    Upload Center Logo
                  </label>
                  
                  {logoSrc ? (
                    <div className="flex items-center justify-between bg-surface-container rounded-xl p-3 border border-outline-variant">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoSrc} alt="Center Logo" className="w-10 h-10 object-contain rounded-lg border border-outline-variant bg-white p-1" />
                        <span className="text-xs font-bold text-on-surface">Logo Attached</span>
                      </div>
                      <button
                        onClick={() => setLogoSrc(null)}
                        className="text-xs font-bold text-error hover:underline px-3 py-1.5 rounded-lg bg-error/10"
                      >
                        Remove Logo
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-outline-variant hover:border-primary rounded-xl cursor-pointer bg-surface-container/50 hover:bg-surface-container transition-all">
                      <span className="material-symbols-outlined text-primary text-3xl mb-1">add_photo_alternate</span>
                      <span className="text-xs font-bold text-on-surface">Click to upload brand logo</span>
                      <span className="text-[10px] text-on-surface-variant/70 mt-1">PNG, JPG, SVG up to 2MB</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                  <p className="text-[11px] text-on-surface-variant/70">
                    High error correction (<code className="font-mono bg-surface-container px-1 rounded">level=&quot;H&quot;</code>) ensures your QR code remains 100% scannable with embedded logos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. RIGHT COLUMN: STICKY PREVIEW & DOWNLOAD ── */}
        <div className="lg:col-span-5">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm sticky top-24 space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="text-sm font-extrabold text-on-surface uppercase tracking-wider">
                Live QR Preview
              </h3>
              <span className="text-xs font-mono font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                Level H
              </span>
            </div>

            {/* CENTRAL VECTOR PREVIEW CONTAINER */}
            <div
              ref={svgContainerRef}
              className="flex flex-col items-center justify-center p-6 rounded-2xl border border-outline-variant transition-all shadow-inner relative"
              style={{ backgroundColor: bgColor }}
            >
              {/* FRAME STYLING CONTAINER */}
              <div className="flex flex-col items-center">
                {frameStyle === 'badge' && (
                  <div className="bg-primary text-on-primary text-xs font-extrabold px-4 py-1 rounded-t-lg uppercase tracking-wider mb-2 shadow-xs">
                    {frameText || 'SCAN ME'}
                  </div>
                )}

                <div className={`p-4 rounded-xl ${frameStyle === 'simple' || frameStyle === 'scanme' ? 'border-4 border-primary' : ''}`}>
                  {isValid ? (
                    <QRCodeSVG
                      value={qrValue}
                      size={220}
                      fgColor={fgColor}
                      bgColor={bgColor}
                      level="H"
                      includeMargin={true}
                      imageSettings={
                        logoSrc
                          ? {
                              src: logoSrc,
                              x: undefined,
                              y: undefined,
                              height: 44,
                              width: 44,
                              excavate: true,
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <div className="w-[220px] h-[220px] flex flex-col items-center justify-center text-center p-4">
                      <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl mb-2">
                        qr_code_2
                      </span>
                      <p className="text-xs font-bold text-on-surface-variant/60">
                        Enter details on the left to view your live QR code.
                      </p>
                    </div>
                  )}
                </div>

                {frameStyle === 'scanme' && (
                  <div className="bg-primary text-on-primary text-xs font-extrabold px-5 py-1.5 rounded-b-lg uppercase tracking-wider mt-2 shadow-xs">
                    {frameText || 'SCAN ME'}
                  </div>
                )}
              </div>
            </div>

            {/* HIDDEN CANVAS FOR HIGH-RES PNG EXPORT */}
            <div className="hidden">
              {isValid && (
                <QRCodeCanvas
                  ref={canvasRef}
                  value={qrValue}
                  size={downloadSize}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  level="H"
                  includeMargin={true}
                  imageSettings={
                    logoSrc
                      ? {
                          src: logoSrc,
                          x: undefined,
                          y: undefined,
                          height: Math.round(downloadSize * 0.2),
                          width: Math.round(downloadSize * 0.2),
                          excavate: true,
                        }
                      : undefined
                  }
                />
              )}
            </div>

            {/* DOWNLOAD CONFIGURATION & CONTROLS */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">
                    Format
                  </label>
                  <select
                    value={downloadFormat}
                    onChange={e => setDownloadFormat(e.target.value as 'png' | 'svg')}
                    className="w-full bg-surface-container rounded-xl border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer"
                  >
                    <option value="png">PNG (Raster)</option>
                    <option value="svg">SVG (Vector)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">
                    Resolution
                  </label>
                  <select
                    value={downloadSize}
                    onChange={e => setDownloadSize(Number(e.target.value))}
                    disabled={downloadFormat === 'svg'}
                    className="w-full bg-surface-container rounded-xl border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface outline-none cursor-pointer disabled:opacity-50"
                  >
                    {RESOLUTION_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* HIGH-VISIBILITY PRIMARY DOWNLOAD BUTTON */}
              <button
                onClick={handleDownload}
                disabled={!isValid}
                className="w-full bg-primary text-on-primary font-extrabold py-3.5 px-4 rounded-xl shadow-md shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                <span>Download QR Code ({downloadFormat.toUpperCase()})</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
