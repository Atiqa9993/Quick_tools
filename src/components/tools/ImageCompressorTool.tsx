'use client'
import { useState, useCallback } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'

export default function ImageCompressorTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [targetKb, setTargetKb] = useState('')
  const [finalSize, setFinalSize] = useState<number | null>(null)

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const originalKb = files[0] ? Math.round(files[0].size / 1024) : 0
  const targetNum = parseInt(targetKb)
  const isValidTarget = targetKb !== '' && targetNum > 0 && targetNum < originalKb

  const compressImage = useCallback(async () => {
    if (files.length !== 1) { setError('Please upload an image.'); return }
    if (!isValidTarget) {
      setError(`Target size must be between 1 KB and ${originalKb} KB.`)
      return
    }

    setLoading(true)
    setError('')
    setDone(false)
    setProgress(0)
    setFinalSize(null)

    try {
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 12, 90))
      }, 300)

      const formData = new FormData()
      formData.append('file', files[0])
      formData.append('target_kb', targetKb)

      const response = await fetch('http://127.0.0.1:8000/api/tools/image-compressor', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to compress image.')
      }

      const blob = await response.blob()
      setFinalSize(blob.size)

      const contentDisposition = response.headers.get('Content-Disposition') || ''
      let filename = 'compressed_image'
      const match = contentDisposition.match(/filename="(.+)"/)
      if (match) filename = match[1]

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compress image')
    } finally {
      setLoading(false)
    }
  }, [files, targetKb, isValidTarget, originalKb])

  const reset = () => {
    setFiles([]); setDone(false); setError('')
    setProgress(0); setTargetKb(''); setFinalSize(null)
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
            setTargetKb('')
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

      {!done && !loading && files.length === 1 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm space-y-6">

          {/* File info */}
          <div className="flex items-center gap-4 pb-5 border-b border-outline-variant">
            <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 26 }}>image</span>
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface truncate max-w-[220px] sm:max-w-sm">{files[0].name}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Current size: <strong className="text-on-surface">{formatSize(files[0].size)}</strong>
                <span className="mx-2 text-outline-variant">·</span>
                {files[0].type || 'Image'}
              </p>
            </div>
          </div>

          {/* Target size input */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              I want my image to be approximately
            </label>
            <p className="text-xs text-on-surface-variant mb-3">
              Your image is currently <strong>{originalKb} KB</strong>. Enter any size smaller than that.
            </p>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max={originalKb - 1}
                  value={targetKb}
                  onChange={(e) => {
                    setError('')
                    setTargetKb(e.target.value)
                  }}
                  placeholder={`e.g. ${Math.round(originalKb * 0.5)}`}
                  className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-on-surface text-lg font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">KB</span>
              </div>
            </div>

            {/* Quick presets */}
            {originalKb > 100 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs text-on-surface-variant self-center">Quick:</span>
                {[
                  { label: '75%', value: Math.round(originalKb * 0.75) },
                  { label: '50%', value: Math.round(originalKb * 0.50) },
                  { label: '25%', value: Math.round(originalKb * 0.25) },
                  { label: '100 KB', value: 100 },
                ].filter(p => p.value > 0 && p.value < originalKb).map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => { setError(''); setTargetKb(preset.value.toString()) }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-semibold ${
                      targetKb === preset.value.toString()
                        ? 'bg-primary text-on-primary border-primary'
                        : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                    }`}
                  >
                    {preset.label} (~{preset.value} KB)
                  </button>
                ))}
              </div>
            )}

            {/* Size preview */}
            {isValidTarget && (
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/50">
                  <p className="text-xs text-on-surface-variant mb-1">Before</p>
                  <p className="text-sm font-bold text-on-surface">{originalKb} KB</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                  <p className="text-xs text-primary mb-1">Savings</p>
                  <p className="text-sm font-bold text-primary">
                    ~{Math.round(((originalKb - targetNum) / originalKb) * 100)}%
                  </p>
                </div>
                <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/50">
                  <p className="text-xs text-on-surface-variant mb-1">After</p>
                  <p className="text-sm font-bold text-on-surface">~{targetNum} KB</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!done && !loading && files.length === 1 && (
        <button
          onClick={compressImage}
          disabled={!isValidTarget || !!error}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-colors shadow-sm text-sm tracking-wide ${
            !isValidTarget || !!error
              ? 'bg-surface-variant text-outline cursor-not-allowed'
              : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>photo_size_select_small</span>
          Compress Image
        </button>
      )}

      {loading && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-surface-variant border-t-primary animate-spin" />
          <h3 className="text-headline-sm text-on-surface mb-2">Compressing...</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Optimizing your image to reach ~{targetKb} KB.</p>
          <div className="max-w-xs mx-auto">
            <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-on-surface-variant mt-2 font-bold">{Math.round(progress)}%</p>
          </div>
        </div>
      )}

      {done && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-container rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>check_circle</span>
          </div>
          <h3 className="text-headline-sm text-on-surface mb-2">Compression Complete!</h3>
          {finalSize !== null && (
            <div className="flex justify-center gap-6 my-4 text-sm">
              <div>
                <p className="text-on-surface-variant">Before</p>
                <p className="font-bold text-on-surface">{originalKb} KB</p>
              </div>
              <span className="material-symbols-outlined text-primary self-center">arrow_forward</span>
              <div>
                <p className="text-on-surface-variant">After</p>
                <p className="font-bold text-primary">{formatSize(finalSize)}</p>
              </div>
            </div>
          )}
          <p className="text-body-sm text-on-surface-variant mb-6">Your optimized image has been downloaded.</p>
          <button onClick={reset} className="inline-flex items-center gap-2 border border-outline text-on-surface font-bold px-6 py-3 rounded-xl hover:bg-surface-variant transition-colors text-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Compress another image
          </button>
        </div>
      )}
    </div>
  )
}
