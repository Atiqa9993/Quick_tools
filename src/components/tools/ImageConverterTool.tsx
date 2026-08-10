'use client'
import { useState, useCallback } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'

const FORMATS = [
  { value: 'PNG',  label: 'PNG',  desc: 'Lossless · Transparent',  icon: 'layers' },
  { value: 'JPEG', label: 'JPG',  desc: 'Best for photos',         icon: 'photo_camera' },
  { value: 'WEBP', label: 'WEBP', desc: 'Web optimized · Smaller', icon: 'language' },
  { value: 'GIF',  label: 'GIF',  desc: 'Animated support',        icon: 'gif_box' },
  { value: 'BMP',  label: 'BMP',  desc: 'Uncompressed bitmap',     icon: 'grid_on' },
  { value: 'TIFF', label: 'TIFF', desc: 'High quality print',      icon: 'print' },
]

export default function ImageConverterTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [targetFormat, setTargetFormat] = useState('JPEG')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [resultUrl, setResultUrl] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [resultSize, setResultSize] = useState<number | null>(null)

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Detect the current file's format from extension
  const getFileExt = (name: string) => {
    const ext = name.split('.').pop()?.toUpperCase() || ''
    if (ext === 'JPG' || ext === 'JPEG') return 'JPG'
    return ext
  }

  const currentExt = files[0] ? getFileExt(files[0].name) : ''

  const handleConvert = useCallback(async () => {
    if (files.length === 0) { setError('Please upload an image first.'); return }

    setLoading(true)
    setError('')
    setDone(false)
    setProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 15, 90))
      }, 250)

      const formData = new FormData()
      formData.append('file', files[0])
      formData.append('target_format', targetFormat)

      const response = await fetch('http://127.0.0.1:8000/api/tools/image-converter', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to convert image.')
      }

      const blob = await response.blob()
      setResultSize(blob.size)

      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [files, targetFormat])

  const downloadFile = () => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    const originalName = files[0].name
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName
    a.download = `${baseName}_converted.${targetFormat.toLowerCase() === 'jpeg' ? 'jpg' : targetFormat.toLowerCase()}`
    a.click()
  }

  const reset = () => {
    setFiles([]); setDone(false); setError('')
    setResultUrl(''); setProgress(0); setResultSize(null)
  }

  return (
    <div className="space-y-6">
      {!done && !loading && (
        <FileDropzone
          accept="image/*,.heic"
          acceptLabel="Image files (HEIC, JPG, PNG, WEBP, etc.)"
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

      {!done && !loading && files.length === 1 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm space-y-6">

          {/* File info */}
          <div className="flex items-center gap-4 pb-5 border-b border-outline-variant">
            <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 26 }}>image</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface truncate max-w-[220px] sm:max-w-sm">{files[0].name}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Current size: <strong className="text-on-surface">{formatSize(files[0].size)}</strong>
                <span className="mx-2 text-outline-variant">·</span>
                Format: <strong className="text-on-surface">{currentExt}</strong>
              </p>
            </div>
          </div>

          {/* Format selection */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              Convert to
            </label>
            <p className="text-xs text-on-surface-variant mb-4">
              Select the output format. Quality and transparency are preserved automatically.
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {FORMATS.map(f => {
                const isActive = targetFormat === f.value
                const isSame = currentExt === f.label
                return (
                  <button
                    key={f.value}
                    onClick={() => setTargetFormat(f.value)}
                    disabled={isSame}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      isSame
                        ? 'border-outline-variant/50 bg-surface-variant/30 opacity-50 cursor-not-allowed'
                        : isActive
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-outline-variant/60 hover:border-primary/40 hover:bg-surface-container cursor-pointer'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}
                      style={{ fontSize: 22 }}
                    >
                      {f.icon}
                    </span>
                    <span className={`text-xs font-bold tracking-wide ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                      {f.label}
                    </span>
                    <span className="text-[10px] text-on-surface-variant leading-tight hidden sm:block">
                      {f.desc}
                    </span>
                    {isSame && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded-full font-bold border border-outline-variant">
                        Current
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Conversion preview */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/50">
              <p className="text-xs text-on-surface-variant mb-1">From</p>
              <p className="text-sm font-bold text-on-surface">{currentExt}</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>arrow_forward</span>
            </div>
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/50">
              <p className="text-xs text-on-surface-variant mb-1">To</p>
              <p className="text-sm font-bold text-primary">
                {FORMATS.find(f => f.value === targetFormat)?.label || targetFormat}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Convert button */}
      {!done && !loading && files.length === 1 && (
        <button
          onClick={handleConvert}
          disabled={currentExt === (FORMATS.find(f => f.value === targetFormat)?.label || '')}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-colors shadow-sm text-sm tracking-wide ${
            currentExt === (FORMATS.find(f => f.value === targetFormat)?.label || '')
              ? 'bg-surface-variant text-outline cursor-not-allowed'
              : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>sync_alt</span>
          Convert to {FORMATS.find(f => f.value === targetFormat)?.label || targetFormat}
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-surface-variant border-t-primary animate-spin" />
          <h3 className="text-headline-sm text-on-surface mb-2">Converting...</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">
            Converting your image to {FORMATS.find(f => f.value === targetFormat)?.label || targetFormat} format.
          </p>
          <div className="max-w-xs mx-auto">
            <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-on-surface-variant mt-2 font-bold">{Math.round(progress)}%</p>
          </div>
        </div>
      )}

      {/* Done */}
      {done && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-container rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>check_circle</span>
          </div>
          <h3 className="text-headline-sm text-on-surface mb-2">Conversion Complete!</h3>
          {resultSize !== null && (
            <div className="flex justify-center gap-6 my-4 text-sm">
              <div>
                <p className="text-on-surface-variant">Original</p>
                <p className="font-bold text-on-surface">{formatSize(files[0]?.size || 0)}</p>
              </div>
              <span className="material-symbols-outlined text-primary self-center">arrow_forward</span>
              <div>
                <p className="text-on-surface-variant">Converted</p>
                <p className="font-bold text-primary">{formatSize(resultSize)}</p>
              </div>
            </div>
          )}
          <p className="text-body-sm text-on-surface-variant mb-6">
            Your image has been converted to {FORMATS.find(f => f.value === targetFormat)?.label || targetFormat}.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={downloadFile}
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
              Download {FORMATS.find(f => f.value === targetFormat)?.label || targetFormat}
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 border border-outline text-on-surface font-bold px-6 py-3 rounded-xl hover:bg-surface-variant transition-colors text-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
              Convert another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
