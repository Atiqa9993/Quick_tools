'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'

/* ─────────────────────────────────────────────────────────────────────────────
   TOP 6 HIGH-DEMAND CATEGORIES
   ───────────────────────────────────────────────────────────────────────────── */
const MAIN_TABS = [
  { key: 'url',      label: 'URL / Link',      icon: 'link',          placeholder: 'https://example.com' },
  { key: 'text',     label: 'Text',            icon: 'notes',         placeholder: 'Enter your text or message...' },
  { key: 'whatsapp', label: 'WhatsApp',        icon: 'chat',          placeholder: '+92 300 1234567' },
  { key: 'social',   label: 'Social Media',    icon: 'share',         placeholder: '@username or profile URL' },
  { key: 'wifi',     label: 'WiFi',            icon: 'wifi',          placeholder: 'MyNetwork' },
  { key: 'file',     label: 'File / PDF',      icon: 'picture_as_pdf',placeholder: 'https://drive.google.com/file/d/...' },
]

/* ── Rich Color Presets with Vivid Preview Colors ── */
const COLOR_PRESETS = [
  { name: 'Classic Black', fg: '#000000', bg: '#ffffff' },
  { name: 'Ocean Blue',   fg: '#0284c7', bg: '#ffffff' },
  { name: 'Emerald Green',fg: '#059669', bg: '#ffffff' },
  { name: 'Crimson Red',  fg: '#dc2626', bg: '#ffffff' },
  { name: 'Royal Purple', fg: '#7c3aed', bg: '#ffffff' },
  { name: 'Midnight Dark',fg: '#ffffff', bg: '#0f172a' },
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
  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('url')

  // Fields per tab
  const [fields, setFields] = useState<Record<string, string>>({ url: '' })

  // Customization Navigation
  const [activeSubTab, setActiveSubTab] = useState<'colors' | 'frame' | 'logo'>('colors')

  // Color Controls
  const [fgColor, setFgColor] = useState<string>('#7c3aed') // Default Royal Purple
  const [bgColor, setBgColor] = useState<string>('#ffffff')

  // Frame Settings
  const [frameStyle, setFrameStyle] = useState<string>('none')
  const [frameText, setFrameText] = useState<string>('SCAN ME')

  // Logo Settings
  const [logoSrc, setLogoSrc] = useState<string | null>(null)

  // Download Config
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'svg'>('png')
  const [downloadSize, setDownloadSize] = useState<number>(1000)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const svgContainerRef = useRef<HTMLDivElement | null>(null)

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

  // Download Handler
  const handleDownload = () => {
    if (!isValid) return

    if (downloadFormat === 'png') {
      const canvas = canvasRef.current
      if (!canvas) return
      const link = document.createElement('a')
      link.download = `qrcode_${activeTab}_${downloadSize}x${downloadSize}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    } else {
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

  // Render input fields
  const renderTabInputs = () => {
    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 font-medium"
    const labelClass = "text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 block"

    switch (activeTab) {
      case 'url':
        return (
          <div>
            <label className={labelClass}>Website URL / Link</label>
            <input
              type="url"
              value={fields.url || ''}
              onChange={e => updateField('url', e.target.value)}
              placeholder="https://www.instagram.com/"
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
            <p className="text-xs text-slate-500">
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
      {/* ── 1. TOP TABS NAVIGATION ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MAIN_TABS.map(t => {
            const isActive = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl transition-all font-bold text-xs ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── SPLIT LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── 2. LEFT COLUMN: CONTENT & CUSTOMIZE ── */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* CONTENT STEP CONTAINER */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">1</span>
                Add {MAIN_TABS.find(t => t.key === activeTab)?.label} Content
              </h2>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                Live Sync
              </span>
            </div>
            {renderTabInputs()}
          </div>

          {/* CUSTOMIZE SECTION WITH HIGH CONTRAST COLORS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">2</span>
                Customize QR Design
              </h2>
              
              {/* SUB TABS */}
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setActiveSubTab('colors')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === 'colors' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Colors
                </button>
                <button
                  onClick={() => setActiveSubTab('frame')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === 'frame' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Frame
                </button>
                <button
                  onClick={() => setActiveSubTab('logo')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === 'logo' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 block">
                      Color Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      {COLOR_PRESETS.map((preset, i) => {
                        const isSelected = fgColor.toLowerCase() === preset.fg.toLowerCase() && bgColor.toLowerCase() === preset.bg.toLowerCase()
                        return (
                          <button
                            key={i}
                            onClick={() => { setFgColor(preset.fg); setBgColor(preset.bg); }}
                            className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20 scale-105'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {/* Color Swatch Circle */}
                            <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-600 overflow-hidden relative shadow-sm">
                              <div className="w-1/2 h-full absolute left-0" style={{ backgroundColor: preset.fg }}></div>
                              <div className="w-1/2 h-full absolute right-0" style={{ backgroundColor: preset.bg }}></div>
                            </div>
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center">{preset.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* CUSTOM COLOR PICKERS WITH CLEAR HEX CONTRAST */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Foreground Picker */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Foreground Color</span>
                        <span className="text-[10px] text-slate-500 font-medium">QR modules & bars</span>
                      </div>
                      <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                          type="color"
                          value={fgColor}
                          onChange={e => setFgColor(e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={fgColor.toUpperCase()}
                          onChange={e => setFgColor(e.target.value)}
                          className="w-16 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 uppercase bg-transparent outline-none"
                        />
                      </div>
                    </div>

                    {/* Background Picker */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Background Color</span>
                        <span className="text-[10px] text-slate-500 font-medium">QR card background</span>
                      </div>
                      <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={e => setBgColor(e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={bgColor.toUpperCase()}
                          onChange={e => setBgColor(e.target.value)}
                          className="w-16 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 uppercase bg-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB: FRAME TEMPLATES */}
              {activeSubTab === 'frame' && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">
                      Frame Template
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {FRAME_TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setFrameStyle(t.id)}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all font-bold text-xs ${
                            frameStyle === t.id
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 block">
                        Frame Text
                      </label>
                      <input
                        type="text"
                        value={frameText}
                        onChange={e => setFrameText(e.target.value)}
                        placeholder="SCAN ME"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SUB TAB: LOGO UPLOAD */}
              {activeSubTab === 'logo' && (
                <div className="space-y-4 animate-fadeIn">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Upload Center Logo
                  </label>
                  
                  {logoSrc ? (
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoSrc} alt="Center Logo" className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white p-1" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Logo Attached</span>
                      </div>
                      <button
                        onClick={() => setLogoSrc(null)}
                        className="text-xs font-bold text-red-600 hover:underline px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950"
                      >
                        Remove Logo
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-600 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 transition-all">
                      <span className="material-symbols-outlined text-blue-600 text-3xl mb-1">add_photo_alternate</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Click to upload brand logo</span>
                      <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, SVG up to 2MB</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                  <p className="text-[11px] text-slate-500">
                    High error correction (<code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-700 dark:text-slate-300">level=&quot;H&quot;</code>) ensures your QR code remains 100% scannable with embedded logos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. RIGHT COLUMN: PREVIEW & DOWNLOAD ── */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm sticky top-24 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Live QR Preview
              </h3>
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Level H
              </span>
            </div>

            {/* PREVIEW CONTAINER */}
            <div
              ref={svgContainerRef}
              className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-inner relative"
              style={{ backgroundColor: bgColor }}
            >
              <div className="flex flex-col items-center">
                {frameStyle === 'badge' && (
                  <div className="bg-blue-600 text-white text-xs font-extrabold px-4 py-1 rounded-t-lg uppercase tracking-wider mb-2 shadow-xs">
                    {frameText || 'SCAN ME'}
                  </div>
                )}

                <div className={`p-4 rounded-xl ${frameStyle === 'simple' || frameStyle === 'scanme' ? 'border-4 border-blue-600' : ''}`}>
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
                      <span className="material-symbols-outlined text-slate-400 text-5xl mb-2">
                        qr_code_2
                      </span>
                      <p className="text-xs font-bold text-slate-500">
                        Enter details on the left to view your live QR code.
                      </p>
                    </div>
                  )}
                </div>

                {frameStyle === 'scanme' && (
                  <div className="bg-blue-600 text-white text-xs font-extrabold px-5 py-1.5 rounded-b-lg uppercase tracking-wider mt-2 shadow-xs">
                    {frameText || 'SCAN ME'}
                  </div>
                )}
              </div>
            </div>

            {/* HIDDEN CANVAS FOR HIGH-RES EXPORT */}
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

            {/* DOWNLOAD CONTROLS */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 block">
                    Format
                  </label>
                  <select
                    value={downloadFormat}
                    onChange={e => setDownloadFormat(e.target.value as 'png' | 'svg')}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="png">PNG (Raster)</option>
                    <option value="svg">SVG (Vector)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 block">
                    Resolution
                  </label>
                  <select
                    value={downloadSize}
                    onChange={e => setDownloadSize(Number(e.target.value))}
                    disabled={downloadFormat === 'svg'}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer disabled:opacity-50"
                  >
                    {RESOLUTION_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PRIMARY DOWNLOAD BUTTON */}
              <button
                onClick={handleDownload}
                disabled={!isValid}
                className="w-full bg-blue-600 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
