'use client'
import { useState } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'
import ResultPanel from '@/components/tools/ResultPanel'

export default function HandwritingTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const processFile = async () => {
    if (files.length === 0) return

    if (!loggedIn) {
      const scans = parseInt(localStorage.getItem('anonymous_ocr_scans') || '0', 10)
      if (scans >= 3) {
        window.location.href = '/auth?redirect=/tools/handwriting-to-text'
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
        body: JSON.stringify({ base64, mimeType: file.type }),
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
  }

  const reset = () => { setFiles([]); setResult(''); setError('') }

  return (
    <div className="space-y-6">
      {!result && !loading && (
        <FileDropzone
          accept="image/jpeg,image/png,image/webp,image/heic"
          acceptLabel="JPG, PNG, WEBP, HEIC"
          files={files}
          onFilesChange={setFiles}
        />
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
          </svg>
          {error}
        </div>
      )}

      {!result && !loading && files.length > 0 && (
        <button onClick={processFile} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-200 text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          {loggedIn ? 'Extract Text' : 'Extract Text (Free Trial)'}
        </button>
      )}

      <ResultPanel text={result} isLoading={loading} loadingText="Extracting text from your handwriting..." filename="handwriting-text" />

      {result && (
        <button onClick={reset} className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Process another image
        </button>
      )}
    </div>
  )
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
