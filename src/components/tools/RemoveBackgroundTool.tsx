'use client'
import { useState, useCallback, useEffect } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'

// --- Color Palettes ---
const BG_COLORS = {
  'Neutral': ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#1e293b', '#0f172a', '#000000'],
  'Professional': ['#1a56db', '#1c64f2', '#0e9f6e', '#057a55', '#7e3af2', '#6c2bd9', '#c81e1e'],
  'Warm': ['#fff7ed', '#ffedd5', '#fef3c7', '#fde68a', '#fca5a5', '#f87171', '#fb923c'],
  'Cool': ['#eff6ff', '#dbeafe', '#e0f2fe', '#bae6fd', '#dcfce7', '#bbf7d0', '#d1fae5'],
  'Gradient-Ready': ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b'],
}

const OUTLINE_COLORS = [
  { label: 'Gold',      value: '#FFD700', class: 'bg-[#FFD700]' },
  { label: 'Shiny Gold',value: '#F5C518', class: 'bg-[#F5C518]' },
  { label: 'Rose Gold', value: '#E8A598', class: 'bg-[#E8A598]' },
  { label: 'Silver',    value: '#C0C0C0', class: 'bg-[#C0C0C0]' },
  { label: 'Chrome',    value: '#E8E8E8', class: 'bg-[#E8E8E8]' },
  { label: 'Bronze',    value: '#CD7F32', class: 'bg-[#CD7F32]' },
  { label: 'Platinum',  value: '#E5E4E2', class: 'bg-[#E5E4E2]' },
  { label: 'Neon Pink', value: '#FF10F0', class: 'bg-[#FF10F0]' },
  { label: 'Neon Blue', value: '#00FFFF', class: 'bg-[#00FFFF]' },
  { label: 'Neon Green',value: '#39FF14', class: 'bg-[#39FF14]' },
  { label: 'White',     value: '#ffffff', class: 'bg-white border border-gray-200' },
  { label: 'Black',     value: '#000000', class: 'bg-black' },
]

const BORDER_SHAPES = [
  { label: 'None',    value: 0,   icon: '▭' },
  { label: 'Slight',  value: 20,  icon: '▢' },
  { label: 'Round',   value: 60,  icon: '▢' },
  { label: 'Circle',  value: 999, icon: '⬤' },
]

export default function RemoveBackgroundTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [appState, setAppState] = useState<'upload' | 'removing' | 'editing' | 'downloading'>('upload')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  // Background
  const [bgMode, setBgMode] = useState<'transparent' | 'color'>('transparent')
  const [bgColor, setBgColor] = useState('#1a56db')
  const [activeBgCategory, setActiveBgCategory] = useState('Professional')

  // Outline
  const [addOutline, setAddOutline] = useState(false)
  const [outlineColor, setOutlineColor] = useState('#FFD700')
  const [outlineSize, setOutlineSize] = useState(12)

  // Border Shape
  const [borderRadius, setBorderRadius] = useState(0)
  const [addBorder, setAddBorder] = useState(false)
  const [borderColor, setBorderColor] = useState('#FFD700')
  const [borderThickness, setBorderThickness] = useState(15)

  // Trigger removal automatically when file is selected
  useEffect(() => {
    if (files.length === 1 && appState === 'upload') {
      removeBackgroundFirst(files[0])
    }
  }, [files])

  const removeBackgroundFirst = async (file: File) => {
    setAppState('removing')
    setError('')
    setProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 4, 85))
      }, 500)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://127.0.0.1:8000/api/tools/remove-background', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to remove background.')
      }

      const blob = await response.blob()
      setProcessedBlob(blob)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setAppState('editing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image')
      setAppState('upload')
      setFiles([])
    }
  }

  const applyEditsAndDownload = async () => {
    if (!processedBlob) return
    setAppState('downloading')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', processedBlob, 'transparent.png')
      formData.append('skip_remove', 'true') // Tell backend to skip rembg

      if (bgMode === 'color') formData.append('bg_color', bgColor)
      if (addOutline) {
        formData.append('outline_color', outlineColor)
        formData.append('outline_size', outlineSize.toString())
      }
      if (borderRadius > 0) formData.append('border_radius', borderRadius.toString())
      if (addBorder) {
        formData.append('border_color', borderColor)
        formData.append('border_thickness', borderThickness.toString())
      }

      const response = await fetch('http://127.0.0.1:8000/api/tools/remove-background', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to apply edits.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = bgMode === 'color' ? 'edited_image.jpg' : 'edited_image.png'
      a.click()
      URL.revokeObjectURL(url)
      
      setAppState('editing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download image')
      setAppState('editing')
    }
  }

  const reset = () => { 
    setFiles([]); setAppState('upload'); setError(''); setProgress(0); setPreviewUrl(''); setProcessedBlob(null) 
  }

  const checkerBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23e5e7eb'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23e5e7eb'/%3E%3Crect x='8' y='0' width='8' height='8' fill='%23f9fafb'/%3E%3Crect x='0' y='8' width='8' height='8' fill='%23f9fafb'/%3E%3C/svg%3E")`

  return (
    <div className="space-y-6">
      {appState === 'upload' && (
        <FileDropzone
          accept="image/*"
          acceptLabel="Image files (PNG, JPG, WEBP)"
          multiple={false}
          files={files}
          onFilesChange={(newFiles) => { setError(''); setFiles(newFiles.slice(0, 1)) }}
        />
      )}

      {error && (
        <div className="flex items-center gap-3 bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl border border-error/20">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
          {error}
        </div>
      )}

      {appState === 'removing' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-10 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full border-4 border-surface-variant border-t-primary animate-spin" />
          <h3 className="font-bold text-on-surface text-lg mb-2">AI is removing the background…</h3>
          <p className="text-sm text-on-surface-variant mb-6">Analyzing edges and subject boundaries carefully.</p>
          <div className="max-w-xs mx-auto bg-surface-variant rounded-full overflow-hidden h-2">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {(appState === 'editing' || appState === 'downloading') && previewUrl && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col lg:flex-row">
          
          {/* ── Live Preview Panel ── */}
          <div className="flex-1 p-6 bg-surface-container/30 flex flex-col items-center justify-center min-h-[420px] relative border-b lg:border-b-0 lg:border-r border-outline-variant">
            
            <button onClick={reset} className="absolute top-4 left-4 flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors bg-surface-container px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              Upload New
            </button>

            <div className="w-full max-w-sm aspect-square flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 relative"
              style={{
                borderRadius: borderRadius === 999 ? '50%' : `${borderRadius}px`,
                border: addBorder ? `${borderThickness}px solid ${borderColor}` : 'none',
                backgroundColor: bgMode === 'color' ? bgColor : 'transparent',
                backgroundImage: bgMode === 'transparent' ? checkerBg : 'none',
                backgroundSize: '16px 16px',
              }}>
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain"
                style={{ 
                  borderRadius: borderRadius === 999 ? '50%' : `${Math.max(0, borderRadius - (addBorder ? borderThickness : 0))}px`,
                  filter: addOutline ? `drop-shadow(0 0 ${outlineSize / 2}px ${outlineColor}) drop-shadow(0 0 ${outlineSize / 2}px ${outlineColor})` : 'none',
                }} />
            </div>
            <p className="text-[11px] text-on-surface-variant mt-6 text-center bg-surface-container px-3 py-1.5 rounded-full font-medium">
              ✨ Background removed! Customize your image below.
            </p>
          </div>

          {/* ── Settings Panel ── */}
          <div className="w-full lg:w-[420px] p-6 bg-surface-container-lowest flex flex-col gap-6">

            {/* Background */}
            <section>
              <h4 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>wallpaper</span>
                Background
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(['transparent', 'color'] as const).map(mode => (
                  <button key={mode} onClick={() => setBgMode(mode)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${bgMode === mode ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                    {mode === 'transparent'
                      ? <><span className="w-4 h-4 rounded-sm" style={{ backgroundImage: checkerBg, backgroundSize: '8px 8px' }} />Transparent</>
                      : <><span className="w-4 h-4 rounded-sm border border-outline-variant" style={{ backgroundColor: bgColor }} />Solid Color</>}
                  </button>
                ))}
              </div>

              {bgMode === 'color' && (
                <div className="bg-surface-container rounded-xl p-3 space-y-2">
                  {/* Category tabs */}
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(BG_COLORS).map(cat => (
                      <button key={cat} onClick={() => setActiveBgCategory(cat)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${activeBgCategory === cat ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant hover:bg-surface-variant'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  {/* Color swatches */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(BG_COLORS[activeBgCategory as keyof typeof BG_COLORS] || []).map(c => (
                      <button key={c} onClick={() => setBgColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${bgColor === c ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant/50'}`}
                        style={{ backgroundColor: c }}
                        title={c} />
                    ))}
                    <div className="flex items-center gap-1 border-l border-outline-variant pl-2 ml-1">
                      <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 p-0 flex-shrink-0 shadow-sm" />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <hr className="border-outline-variant" />

            {/* Subject Outline */}
            <section>
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" checked={addOutline} onChange={e => setAddOutline(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded" />
                <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>auto_awesome</span>
                  Subject Outline (Shiny)
                </span>
              </label>

              {addOutline && (
                <div className="bg-surface-container rounded-xl p-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-on-surface-variant mb-2">Choose Color</p>
                    <div className="grid grid-cols-6 gap-2">
                      {OUTLINE_COLORS.map(c => (
                        <button key={c.value} onClick={() => setOutlineColor(c.value)}
                          title={c.label}
                          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${outlineColor === c.value ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant/50'} ${c.class}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={outlineColor} onChange={e => setOutlineColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border-0 p-0 flex-shrink-0" />
                    <span className="text-xs font-mono text-on-surface-variant">Custom</span>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-xs font-medium text-on-surface-variant">Thickness</p>
                      <p className="text-xs font-bold text-primary">{outlineSize}px</p>
                    </div>
                    <input type="range" min="2" max="40" value={outlineSize} onChange={e => setOutlineSize(parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                </div>
              )}
            </section>

            <hr className="border-outline-variant" />

            {/* Image Shape & Border */}
            <section>
              <h4 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>crop_free</span>
                Image Shape & Border
              </h4>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {BORDER_SHAPES.map(s => (
                  <button key={s.value} onClick={() => setBorderRadius(s.value)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-bold transition-colors ${borderRadius === s.value ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                    <span className="text-lg leading-none"
                      style={{ borderRadius: s.value === 999 ? '50%' : `${Math.min(s.value / 3, 8)}px`, display: 'inline-block', width: 20, height: 20, border: '2px solid currentColor' }} />
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Border/Frame */}
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" checked={addBorder} onChange={e => setAddBorder(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded" />
                <span className="text-sm font-bold text-on-surface">Add Decorative Frame</span>
              </label>

              {addBorder && (
                <div className="bg-surface-container rounded-xl p-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-on-surface-variant mb-2">Border Color</p>
                    <div className="grid grid-cols-6 gap-2">
                      {OUTLINE_COLORS.map(c => (
                        <button key={c.value} onClick={() => setBorderColor(c.value)}
                          title={c.label}
                          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${borderColor === c.value ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant/50'} ${c.class}`} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-xs font-medium text-on-surface-variant">Border Width</p>
                      <p className="text-xs font-bold text-primary">{borderThickness}px</p>
                    </div>
                    <input type="range" min="4" max="60" value={borderThickness} onChange={e => setBorderThickness(parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                </div>
              )}
            </section>

            <button onClick={applyEditsAndDownload} disabled={appState === 'downloading'}
              className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-sm text-sm mt-auto disabled:opacity-50">
              {appState === 'downloading' ? (
                <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>download</span>
              )}
              {appState === 'downloading' ? 'Applying Edits & Downloading...' : 'Download Final Image'}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
