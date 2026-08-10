'use client'
import { useState, useCallback } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'
import ResultPanel from '@/components/tools/ResultPanel'

export default function ImageToTextTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const processFile = useCallback(async () => {
    if (files.length === 0) return

    if (!loggedIn) {
      const scans = parseInt(localStorage.getItem('anonymous_ocr_scans') || '0', 10)
      if (scans >= 3) {
        window.location.href = '/auth?redirect=/tools/image-to-text'
        return
      }
    }

    setLoading(true)
    setError('')
    setResult('')

    try {
      const file = files[0]
      const base64 = await fileToBase64(file)

      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          mimeType: file.type,
          prompt: `You are an expert OCR engine. Analyze this image and extract ALL text — both printed and handwritten.

Rules:
- Preserve the original structure, line breaks, and formatting.
- If there are tables, reproduce them in a readable format.
- If there are lists or bullet points, keep them intact.
- Extract text in the original language(s) present in the image.
- Do NOT add any commentary, headers, or descriptions — return ONLY the raw extracted text.
- If multiple text blocks exist (e.g. columns, captions, labels), extract them all in reading order.`
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to extract text')

      setResult(data.text)

      if (!loggedIn) {
        const scans = parseInt(localStorage.getItem('anonymous_ocr_scans') || '0', 10)
        localStorage.setItem('anonymous_ocr_scans', (scans + 1).toString())
      } else {
        // Update usage
        await fetch('/api/update-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages: 1 }),
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [files, loggedIn])

  const reset = () => { setFiles([]); setResult(''); setError('') }

  return (
    <div className="space-y-6">
      {!result && !loading && (
        <FileDropzone
          accept="image/jpeg,image/png,image/webp,image/heic,image/bmp,image/tiff"
          acceptLabel="JPG, PNG, WEBP, HEIC, BMP, TIFF"
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

      {!result && !loading && files.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm space-y-5">
          {/* File info */}
          <div className="flex items-center gap-4 pb-5 border-b border-outline-variant">
            <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: 26 }}>image</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface truncate max-w-[220px] sm:max-w-sm">{files[0].name}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Size: <strong className="text-on-surface">{formatSize(files[0].size)}</strong>
                <span className="mx-2 text-outline-variant">·</span>
                {files[0].type || 'Image'}
              </p>
            </div>
          </div>

          {/* What we'll do */}
          <div>
            <p className="text-sm font-bold text-on-surface mb-2">What we'll extract</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: 'edit', label: 'Handwritten' },
                { icon: 'text_fields', label: 'Printed Text' },
                { icon: 'table_chart', label: 'Tables' },
                { icon: 'translate', label: '50+ Languages' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2.5 border border-outline-variant/50">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>{item.icon}</span>
                  <span className="text-xs font-medium text-on-surface">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Extract button */}
      {!result && !loading && files.length > 0 && (
        <button
          onClick={processFile}
          className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-colors shadow-sm text-sm tracking-wide bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>document_scanner</span>
          {loggedIn ? 'Extract Text from Image' : 'Extract Text from Image (Free Trial)'}
        </button>
      )}

      {/* Result panel */}
      <ResultPanel
        text={result}
        isLoading={loading}
        loadingText="AI is scanning your image for text..."
        filename="extracted-text"
      />

      {result && (
        <button
          onClick={reset}
          className="w-full inline-flex items-center justify-center gap-2 border border-outline text-on-surface font-bold px-6 py-3 rounded-xl hover:bg-surface-variant transition-colors text-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
          Scan another image
        </button>
      )}
    </div>
  )
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
