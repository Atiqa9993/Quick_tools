'use client'
import { useState } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'
import ResultPanel from '@/components/tools/ResultPanel'

export default function PdfTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const processFile = async () => {
    if (files.length === 0) return

    setLoading(true)
    setError('')
    setResult('')

    try {
      const file = files[0]
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/tools/ocr-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorText = await res.text()
        let detail = 'Failed to extract text from PDF.'
        try {
          const parsed = JSON.parse(errorText)
          if (parsed.detail) detail = parsed.detail
        } catch {}
        throw new Error(detail)
      }

      let extractedText = ''
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await res.json()
        extractedText = data.text || ''
      } else {
        extractedText = await res.text()
      }

      setResult(extractedText || 'No text found in this PDF.')

      // Track usage
      await fetch('/api/update-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: 1 }),
      }).catch(console.error)

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
          accept="application/pdf"
          acceptLabel={`PDF files (Max 5 pages for ${loggedIn ? 'Pro' : 'Free'})`}
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
        <button 
          onClick={processFile} 
          className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-bold py-4 rounded-xl transition-colors shadow-sm text-sm tracking-wide"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>description</span>
          Extract Text from PDF
        </button>
      )}

      <ResultPanel text={result} isLoading={loading} loadingText="Extracting text locally from your PDF..." filename="pdf-text" />

      {result && (
        <button onClick={reset} className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Process another PDF
        </button>
      )}
    </div>
  )
}
