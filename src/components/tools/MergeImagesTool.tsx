'use client'
import { useState, useCallback } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'

export default function MergeImagesTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [mode, setMode] = useState<'vertical' | 'horizontal'>('vertical')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const maxFiles = 10

  const mergeImages = useCallback(async () => {
    if (files.length < 2) {
      setError('Please select at least 2 images to merge.')
      return
    }

    setLoading(true)
    setError('')
    setDone(false)
    setProgress(0)
    setDownloadUrl(null)

    try {
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 8, 90))
      }, 300)

      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })
      formData.append('mode', mode)

      const response = await fetch('/api/tools/merge-images', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to merge images on the server.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const contentDisp = response.headers.get('content-disposition') || ''
      let fileName = `merged_image_${mode}.png`
      if (contentDisp.includes('filename=')) {
        fileName = contentDisp.split('filename=')[1].replace(/"/g, '')
      }

      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
      }, 1500)

      setDownloadUrl(url)
      setDone(true)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to merge images')
    } finally {
      setLoading(false)
    }
  }, [files, mode])

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setFiles([])
    setDone(false)
    setError('')
    setProgress(0)
    setDownloadUrl(null)
  }

  return (
    <div className="space-y-6">
      {/* Layout Selection */}
      {!done && !loading && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Layout Direction
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('vertical')}
              className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-bold transition-all ${
                mode === 'vertical'
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-outline-variant text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>table_rows</span>
              Vertical (Top to Bottom)
            </button>
            <button
              type="button"
              onClick={() => setMode('horizontal')}
              className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-bold transition-all ${
                mode === 'horizontal'
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-outline-variant text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>view_column</span>
              Horizontal (Side by Side)
            </button>
          </div>
        </div>
      )}

      {/* File Dropzone */}
      {!done && !loading && (
        <FileDropzone
          accept="image/png, image/jpeg, image/webp, image/gif, image/bmp"
          acceptLabel={`Image files (JPG, PNG, WEBP, GIF, BMP - Max ${maxFiles} images)`}
          multiple={true}
          maxFiles={maxFiles}
          files={files}
          onFilesChange={(newFiles) => {
            if (newFiles.length > maxFiles) {
              setError(`Free users can merge up to ${maxFiles} images at once.`)
              setFiles(newFiles.slice(0, maxFiles))
            } else {
              setError('')
              setFiles(newFiles)
            }
          }}
        />
      )}

      {error && (
        <div className="flex items-center gap-3 bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl border border-error/20">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
          {error}
        </div>
      )}

      {/* Merge Action Button */}
      {!done && !loading && files.length > 0 && (
        <button
          onClick={mergeImages}
          disabled={!!error || files.length < 2}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-colors shadow-sm text-sm tracking-wide ${
            error || files.length < 2
              ? 'bg-surface-variant text-outline cursor-not-allowed'
              : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>call_merge</span>
          Merge {files.length} Images ({mode === 'vertical' ? 'Vertical' : 'Horizontal'})
        </button>
      )}

      {!done && !loading && files.length === 1 && !error && (
        <p className="text-sm text-on-surface-variant text-center">Add at least 1 more image to merge.</p>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-surface-variant border-t-primary animate-spin" />
          <h3 className="text-headline-sm text-on-surface mb-2">Merging Images...</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Combining {files.length} images into a single {mode} canvas.</p>

          <div className="max-w-xs mx-auto">
            <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-on-surface-variant mt-2 font-bold">{Math.round(progress)}% complete</p>
          </div>
        </div>
      )}

      {/* Success State */}
      {done && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm space-y-6">
          <div className="w-16 h-16 mx-auto bg-primary-container rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>check_circle</span>
          </div>
          <div>
            <h3 className="text-headline-sm text-on-surface mb-1">Images Merged Successfully!</h3>
            <p className="text-body-md text-on-surface-variant">Your merged image is ready for download.</p>
          </div>

          {downloadUrl && (
            <div className="max-w-md mx-auto rounded-xl border border-outline-variant/60 overflow-hidden bg-surface-container/30 p-2">
              <img src={downloadUrl} alt="Merged Result" className="max-h-64 mx-auto object-contain rounded-lg" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`merged_image_${mode}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-bold px-6 py-3 rounded-xl hover:bg-primary-container hover:text-on-primary-container transition-colors text-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                Download Merged Image
              </a>
            )}
            <button onClick={reset} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-outline text-on-surface font-bold px-6 py-3 rounded-xl hover:bg-surface-variant transition-colors text-sm">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
              Merge More Images
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
