'use client'
import { useState, useRef, useCallback } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

/* ── QR Type Definitions ── */
const QR_TYPES = [
  { key: 'url',       label: 'URL',          icon: 'link',          placeholder: 'https://example.com' },
  { key: 'text',      label: 'Plain Text',   icon: 'notes',         placeholder: 'Enter any text here...' },
  { key: 'email',     label: 'Email',        icon: 'mail',          placeholder: '' },
  { key: 'phone',     label: 'Phone',        icon: 'call',          placeholder: '+92 300 1234567' },
  { key: 'sms',       label: 'SMS',          icon: 'sms',           placeholder: '' },
  { key: 'wifi',      label: 'WiFi',         icon: 'wifi',          placeholder: '' },
  { key: 'zoom',      label: 'Zoom',         icon: 'videocam',      placeholder: '' },
  { key: 'whatsapp',  label: 'WhatsApp',     icon: 'chat',          placeholder: '' },
  { key: 'location',  label: 'Location',     icon: 'location_on',   placeholder: '' },
]

function validateFields(type: string, fields: Record<string, string>): boolean {
  switch (type) {
    case 'url':
      return !!fields.url && /^(https?:\/\/)?([\w\-]+(\.[\w\-]+)+)([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?$/.test(fields.url)
    case 'text':
      return !!fields.text && fields.text.trim().length > 0
    case 'email':
      return !!fields.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)
    case 'phone':
      return !!fields.phone && /^[\d\s()+-]{7,}$/.test(fields.phone)
    case 'sms':
      return !!fields.phone && /^[\d\s()+-]{7,}$/.test(fields.phone)
    case 'wifi': {
      const hasSsid = !!fields.ssid && fields.ssid.trim().length > 0
      const isNoPass = fields.encryption === 'nopass'
      const hasPass = !!fields.password && fields.password.trim().length > 0
      return hasSsid && (isNoPass || hasPass)
    }
    case 'zoom':
      return !!fields.meetingId && /^[\d\s]{9,}$/.test(fields.meetingId)
    case 'whatsapp':
      return !!fields.phone && /^[\d\s()+-]{7,}$/.test(fields.phone)
    case 'location': {
      const lat = parseFloat(fields.lat)
      const lng = parseFloat(fields.lng)
      return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    }
    default:
      return false
  }
}

function buildQrValue(type: string, fields: Record<string, string>): string {
  switch (type) {
    case 'url':
      return fields.url || ''
    case 'text':
      return fields.text || ''
    case 'email':
      return `mailto:${fields.email || ''}?subject=${encodeURIComponent(fields.subject || '')}&body=${encodeURIComponent(fields.body || '')}`
    case 'phone':
      return `tel:${fields.phone || ''}`
    case 'sms':
      return `smsto:${fields.phone || ''}:${fields.message || ''}`
    case 'wifi': {
      const enc = fields.encryption || 'WPA'
      const hidden = fields.hidden === 'true' ? 'H:true' : ''
      return `WIFI:T:${enc};S:${fields.ssid || ''};P:${fields.password || ''};${hidden};`
    }
    case 'zoom':
      return `https://zoom.us/j/${(fields.meetingId || '').replace(/\s/g, '')}${fields.password ? '?pwd=' + fields.password : ''}`
    case 'whatsapp':
      return `https://wa.me/${(fields.phone || '').replace(/[^0-9]/g, '')}${fields.message ? '?text=' + encodeURIComponent(fields.message) : ''}`
    case 'location':
      return `geo:${fields.lat || '0'},${fields.lng || '0'}`
    default:
      return ''
  }
}

/* ── Color Presets ── */
const COLOR_PRESETS = [
  { fg: '#000000', bg: '#ffffff', name: 'Classic' },
  { fg: '#1a73e8', bg: '#ffffff', name: 'Blue' },
  { fg: '#0f9d58', bg: '#ffffff', name: 'Green' },
  { fg: '#e8453c', bg: '#ffffff', name: 'Red' },
  { fg: '#8e24aa', bg: '#ffffff', name: 'Purple' },
  { fg: '#ffffff', bg: '#1a1a2e', name: 'Dark' },
]

export default function QrCodeGeneratorTool({ loggedIn }: { loggedIn: boolean }) {
  const [qrType, setQrType] = useState('url')
  const [fields, setFields] = useState<Record<string, string>>({ url: '' })
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [qrSize] = useState(240)

  const canvasRef = useRef<HTMLDivElement>(null)

  const updateField = useCallback((key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleTypeChange = (type: string) => {
    setQrType(type)
    setFields({})
  }

  const qrValue = buildQrValue(qrType, fields)
  const isValid = validateFields(qrType, fields) && qrValue.length > 0
  const hasInput = Object.values(fields).some(val => typeof val === 'string' && val.trim().length > 0)

  const downloadQR = (format: 'png' | 'svg') => {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) return

    if (format === 'png') {
      // Create a higher-res canvas for download
      const hiResCanvas = document.createElement('canvas')
      const scale = 4
      hiResCanvas.width = qrSize * scale
      hiResCanvas.height = qrSize * scale
      const ctx = hiResCanvas.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(canvas, 0, 0, hiResCanvas.width, hiResCanvas.height)
      }
      const link = document.createElement('a')
      link.download = `qrcode_${qrType}.png`
      link.href = hiResCanvas.toDataURL('image/png')
      link.click()
    } else {
      // SVG export from canvas data
      const dataUrl = canvas.toDataURL('image/png')
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${qrSize}" height="${qrSize}"><image href="${dataUrl}" width="${qrSize}" height="${qrSize}"/></svg>`
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const link = document.createElement('a')
      link.download = `qrcode_${qrType}.svg`
      link.href = URL.createObjectURL(blob)
      link.click()
    }
  }

  /* ── Dynamic Form Fields ── */
  const renderFields = () => {
    const inputClass = "w-full bg-surface-container rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/50"
    const labelClass = "text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block"

    switch (qrType) {
      case 'url':
        return (
          <div>
            <label className={labelClass}>Website URL</label>
            <input type="url" value={fields.url || ''} onChange={e => updateField('url', e.target.value)} placeholder="https://example.com" className={inputClass} autoFocus />
          </div>
        )
      case 'text':
        return (
          <div>
            <label className={labelClass}>Your Text</label>
            <textarea value={fields.text || ''} onChange={e => updateField('text', e.target.value)} placeholder="Enter any text..." className={inputClass + ' min-h-[100px] resize-y'} autoFocus />
          </div>
        )
      case 'email':
        return (
          <div className="space-y-4">
            <div><label className={labelClass}>Email Address</label><input type="email" value={fields.email || ''} onChange={e => updateField('email', e.target.value)} placeholder="hello@example.com" className={inputClass} autoFocus /></div>
            <div><label className={labelClass}>Subject (optional)</label><input value={fields.subject || ''} onChange={e => updateField('subject', e.target.value)} placeholder="Meeting follow-up" className={inputClass} /></div>
            <div><label className={labelClass}>Body (optional)</label><textarea value={fields.body || ''} onChange={e => updateField('body', e.target.value)} placeholder="Hi, I wanted to..." className={inputClass + ' min-h-[80px] resize-y'} /></div>
          </div>
        )
      case 'phone':
        return (
          <div>
            <label className={labelClass}>Phone Number</label>
            <input type="tel" value={fields.phone || ''} onChange={e => updateField('phone', e.target.value)} placeholder="+92 300 1234567" className={inputClass} autoFocus />
          </div>
        )
      case 'sms':
        return (
          <div className="space-y-4">
            <div><label className={labelClass}>Phone Number</label><input type="tel" value={fields.phone || ''} onChange={e => updateField('phone', e.target.value)} placeholder="+92 300 1234567" className={inputClass} autoFocus /></div>
            <div><label className={labelClass}>Message (optional)</label><textarea value={fields.message || ''} onChange={e => updateField('message', e.target.value)} placeholder="Hey! Check this out..." className={inputClass + ' min-h-[80px] resize-y'} /></div>
          </div>
        )
      case 'wifi':
        return (
          <div className="space-y-4">
            <div><label className={labelClass}>Network Name (SSID)</label><input value={fields.ssid || ''} onChange={e => updateField('ssid', e.target.value)} placeholder="MyHomeNetwork" className={inputClass} autoFocus /></div>
            <div><label className={labelClass}>Password</label><input type="password" value={fields.password || ''} onChange={e => updateField('password', e.target.value)} placeholder="WiFi password" className={inputClass} /></div>
            <div>
              <label className={labelClass}>Encryption</label>
              <select value={fields.encryption || 'WPA'} onChange={e => updateField('encryption', e.target.value)} className={inputClass + ' cursor-pointer'}>
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">No Password</option>
              </select>
            </div>
          </div>
        )
      case 'zoom':
        return (
          <div className="space-y-4">
            <div><label className={labelClass}>Zoom Meeting ID</label><input value={fields.meetingId || ''} onChange={e => updateField('meetingId', e.target.value)} placeholder="123 456 7890" className={inputClass} autoFocus /></div>
            <div><label className={labelClass}>Passcode (optional)</label><input value={fields.password || ''} onChange={e => updateField('password', e.target.value)} placeholder="abc123" className={inputClass} /></div>
          </div>
        )
      case 'whatsapp':
        return (
          <div className="space-y-4">
            <div><label className={labelClass}>Phone Number (with country code)</label><input type="tel" value={fields.phone || ''} onChange={e => updateField('phone', e.target.value)} placeholder="+92 300 1234567" className={inputClass} autoFocus /></div>
            <div><label className={labelClass}>Pre-filled Message (optional)</label><textarea value={fields.message || ''} onChange={e => updateField('message', e.target.value)} placeholder="Hi! I'm interested in..." className={inputClass + ' min-h-[80px] resize-y'} /></div>
          </div>
        )
      case 'location':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Latitude</label><input type="number" step="any" value={fields.lat || ''} onChange={e => updateField('lat', e.target.value)} placeholder="33.6844" className={inputClass} autoFocus /></div>
              <div><label className={labelClass}>Longitude</label><input type="number" step="any" value={fields.lng || ''} onChange={e => updateField('lng', e.target.value)} placeholder="73.0479" className={inputClass} /></div>
            </div>
            <p className="text-xs text-on-surface-variant">Tip: Right-click on Google Maps → "What&apos;s here?" to get coordinates.</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* QR Type Tabs */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
        {QR_TYPES.map(t => {
          const isActive = qrType === t.key
          return (
            <button
              key={t.key}
              onClick={() => handleTypeChange(t.key)}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all text-center ${
                isActive
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent hover:bg-surface-container'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'text-primary' : 'text-on-surface-variant'}`} style={{ fontSize: 20 }}>{t.icon}</span>
              <span className={`text-[10px] font-bold leading-tight ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{t.label}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* LEFT: Form Fields */}
        <div className="flex-1 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-5 space-y-5">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>{QR_TYPES.find(t => t.key === qrType)?.icon}</span>
              {QR_TYPES.find(t => t.key === qrType)?.label} QR Code
            </h3>
            {renderFields()}
          </div>

          {/* Color Customization */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>palette</span>
              Customize Colors
            </h3>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => { setFgColor(preset.fg); setBgColor(preset.bg); }}
                  className={`w-9 h-9 rounded-lg border-2 transition-all overflow-hidden ${
                    fgColor === preset.fg && bgColor === preset.bg ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-outline-variant hover:scale-105'
                  }`}
                  title={preset.name}
                >
                  <div className="w-full h-1/2" style={{ backgroundColor: preset.fg }}></div>
                  <div className="w-full h-1/2" style={{ backgroundColor: preset.bg }}></div>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs font-bold text-on-surface-variant whitespace-nowrap">FG</label>
                <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent" />
                <span className="text-xs text-on-surface-variant font-mono">{fgColor}</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs font-bold text-on-surface-variant whitespace-nowrap">BG</label>
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent" />
                <span className="text-xs text-on-surface-variant font-mono">{bgColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: QR Preview */}
        <div className="w-full md:w-[300px] shrink-0">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-5 sticky top-24 space-y-5">
            <h3 className="text-sm font-bold text-on-surface text-center">Preview</h3>
            
            <div ref={canvasRef} className="flex items-center justify-center p-4 rounded-xl" style={{ backgroundColor: bgColor, border: '1px solid var(--md-sys-color-outline-variant, #ccc)' }}>
              {isValid ? (
                <QRCodeCanvas
                  value={qrValue}
                  size={qrSize}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="w-[240px] h-[240px] flex flex-col items-center justify-center text-center p-4">
                  <span className={`material-symbols-outlined mb-2 ${hasInput ? 'text-error' : 'text-on-surface-variant/30'}`} style={{ fontSize: 48 }}>
                    {hasInput ? 'error' : 'qr_code_2'}
                  </span>
                  <p className={`text-sm font-bold ${hasInput ? 'text-error' : 'text-on-surface-variant/50'}`}>
                    {hasInput ? "Invalid format!" : "Ready"}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${hasInput ? 'text-error/80' : 'text-on-surface-variant/50'}`}>
                    {hasInput 
                      ? `Please enter a valid ${QR_TYPES.find(t => t.key === qrType)?.label} to generate.` 
                      : "Fill in the fields to generate your QR code."}
                  </p>
                </div>
              )}
            </div>

            {/* Download Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => downloadQR('png')}
                disabled={!isValid}
                className="flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-xs transition-colors bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>image</span>
                PNG
              </button>
              <button
                onClick={() => downloadQR('svg')}
                disabled={!isValid}
                className="flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-xs transition-colors border-2 border-primary text-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>code</span>
                SVG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
