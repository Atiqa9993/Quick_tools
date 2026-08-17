'use client'
import { useState, useCallback, useEffect } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'

export default function ImageResizerTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  // Original image info
  const [originalWidth, setOriginalWidth] = useState<number | null>(null)
  const [originalHeight, setOriginalHeight] = useState<number | null>(null)

  // Resizing state
  const [resizeMode, setResizeMode] = useState<'dimensions' | 'percentage'>('dimensions')
  
  // Dimensions mode
  const [width, setWidth] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [lockAspectRatio, setLockAspectRatio] = useState(true)

  // Percentage mode
  const [percentage, setPercentage] = useState<number>(50)

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Extract dimensions when file is selected
  useEffect(() => {
    if (files.length === 1) {
      const img = new Image()
      img.onload = () => {
        setOriginalWidth(img.naturalWidth)
        setOriginalHeight(img.naturalHeight)
        setWidth(img.naturalWidth.toString())
        setHeight(img.naturalHeight.toString())
      }
      img.src = URL.createObjectURL(files[0])
    } else {
      setOriginalWidth(null)
      setOriginalHeight(null)
      setWidth('')
      setHeight('')
    }
  }, [files])

  // Handle Dimension Inputs (maintaining aspect ratio)
  const handleWidthChange = (val: string) => {
    setWidth(val)
    const numVal = parseInt(val)
    if (lockAspectRatio && originalWidth && originalHeight && !isNaN(numVal)) {
      const ratio = originalHeight / originalWidth
      setHeight(Math.round(numVal * ratio).toString())
    }
  }

  const handleHeightChange = (val: string) => {
    setHeight(val)
    const numVal = parseInt(val)
    if (lockAspectRatio && originalWidth && originalHeight && !isNaN(numVal)) {
      const ratio = originalWidth / originalHeight
      setWidth(Math.round(numVal * ratio).toString())
    }
  }

  const handlePercentageChange = (val: number) => {
    setPercentage(val)
    if (originalWidth && originalHeight) {
      setWidth(Math.round(originalWidth * (val / 100)).toString())
      setHeight(Math.round(originalHeight * (val / 100)).toString())
    }
  }

  const resizeImage = useCallback(async () => {
    if (files.length !== 1) { setError('Please upload an image.'); return }
    const w = parseInt(width)
    const h = parseInt(height)
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      setError('Please enter valid positive dimensions.')
      return
    }

    setLoading(true)
    setError('')
    setDone(false)
    setProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 12, 90))
      }, 300)

      const formData = new FormData()
      formData.append('file', files[0])
      formData.append('width', w.toString())
      formData.append('height', h.toString())
      formData.append('maintain_aspect_ratio', lockAspectRatio ? 'true' : 'false')

      const response = await fetch('/api/tools/image-resizer', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to resize image.')
      }

      const contentDisposition = response.headers.get('Content-Disposition') || ''
      let filename = 'resized_image'
      const match = contentDisposition.match(/filename="(.+)"/)
      if (match) filename = match[1]

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resize image')
    } finally {
      setLoading(false)
    }
  }, [files, width, height])

  const reset = () => {
    setFiles([]); setDone(false); setError(''); setProgress(0)
  }

  return (
    <div className="space-y-6">
      {!done && !loading && (
        <FileDropzone
          accept="image/*"
          acceptLabel="Image files (PNG, JPG, WEBP, etc.)"
          multiple={false}
          files={files}
          onFilesChange={(newFiles) => {
            setError('')
            setFiles(newFiles.slice(0, 1))
          }}
        />
      )}

      {error && (
        <div className="flex items-center gap-3 bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl border border-error/20">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
          {error}
        </div>
      )}

      {!done && !loading && files.length === 1 && originalWidth && originalHeight && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row">
          
          {/* Left Panel: Settings */}
          <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-outline-variant bg-surface-container-lowest">
            <h3 className="text-lg font-bold text-on-surface mb-4">Resize Settings</h3>
            
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-surface-container rounded-lg mb-6">
              <button 
                onClick={() => setResizeMode('dimensions')} 
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${resizeMode === 'dimensions' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                By Dimensions
              </button>
              <button 
                onClick={() => setResizeMode('percentage')} 
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${resizeMode === 'percentage' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                As Percentage
              </button>
            </div>

            {resizeMode === 'dimensions' && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-on-surface-variant mb-1">Width (px)</label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => handleWidthChange(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-bold focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-on-surface-variant mb-1">Height (px)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => handleHeightChange(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-bold focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={lockAspectRatio}
                    onChange={(e) => setLockAspectRatio(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary accent-primary"
                  />
                  <span className="text-sm font-medium text-on-surface">Lock Aspect Ratio</span>
                </label>
              </div>
            )}

            {resizeMode === 'percentage' && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2 text-sm font-bold text-on-surface">
                    <span>Resize by</span>
                    <span className="text-primary bg-primary/10 px-2 rounded">{percentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="200"
                    value={percentage}
                    onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {[25, 50, 75, 150, 200].map(p => (
                    <button
                      key={p}
                      onClick={() => handlePercentageChange(p)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary font-semibold transition-colors"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-outline-variant">
              <button
                onClick={resizeImage}
                className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm text-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>photo_size_select_large</span>
                Resize Image
              </button>
            </div>
          </div>

          {/* Right Panel: Preview */}
          <div className="w-full md:w-1/2 p-6 bg-surface-container/30 flex flex-col items-center justify-center">
             <div className="bg-surface border border-outline-variant rounded-xl p-4 w-full max-w-sm mb-4">
                <p className="text-sm font-bold text-on-surface truncate mb-2">{files[0].name}</p>
                <div className="flex items-center gap-4 text-xs text-on-surface-variant font-medium">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sd_card</span>
                    {formatSize(files[0].size)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>aspect_ratio</span>
                    {originalWidth} × {originalHeight}
                  </div>
                </div>
             </div>

             <div className="w-full max-w-sm bg-surface border border-outline-variant rounded-xl p-6 text-center">
                <span className="material-symbols-outlined text-outline-variant mb-2" style={{ fontSize: 32 }}>transform</span>
                <p className="text-sm text-on-surface-variant mb-1">Target Dimensions</p>
                <p className="text-2xl font-bold text-primary">
                  {width || '0'} <span className="text-outline-variant text-lg px-1">×</span> {height || '0'}
                </p>
             </div>
          </div>

        </div>
      )}

      {loading && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-surface-variant border-t-primary animate-spin" />
          <h3 className="text-headline-sm text-on-surface mb-2">Resizing...</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Generating your image with exact dimensions.</p>
          <div className="max-w-xs mx-auto">
            <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {done && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-container rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>check_circle</span>
          </div>
          <h3 className="text-headline-sm text-on-surface mb-2">Resizing Complete!</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Your resized {width}x{height} image has been downloaded.</p>
          <button onClick={reset} className="inline-flex items-center gap-2 border border-outline text-on-surface font-bold px-6 py-3 rounded-xl hover:bg-surface-variant transition-colors text-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Resize another image
          </button>
        </div>
      )}
    </div>
  )
}
