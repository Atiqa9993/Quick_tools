'use client'
import { useState, useCallback } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'

export default function PdfToWordTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  const convertToWord = useCallback(async () => {
    if (files.length === 0) return

    setLoading(true)
    setError('')
    setDone(false)
    setProgress(0)

    try {
      const file = files[0]
      
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 5, 90))
      }, 500)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://127.0.0.1:8000/api/tools/pdf-to-word', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to convert PDF on the server.')
      }

      const blob = await response.blob()
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Change extension to .docx
      const originalName = file.name.replace(/\.[^/.]+$/, "")
      a.download = `${originalName}.docx`
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to convert PDF to Word')
    } finally {
      setLoading(false)
    }
  }, [files])

  const reset = () => { setFiles([]); setDone(false); setError(''); setProgress(0) }

  return (
    <div className="space-y-6">
      {!done && !loading && (
        <FileDropzone
          accept="application/pdf"
          acceptLabel="PDF files (Max 15MB for Free)"
          maxFiles={1}
          files={files}
          onFilesChange={(newFiles) => {
            if (newFiles.length > 0 && newFiles[0].size > 15 * 1024 * 1024 && !loggedIn) {
              setError('File exceeds the 15MB limit for free users. Please sign in to convert larger files.')
              setFiles([])
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

      {!done && !loading && files.length > 0 && (
        <button 
          onClick={convertToWord} 
          disabled={!!error}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-colors shadow-sm text-sm tracking-wide ${
            error 
              ? 'bg-surface-variant text-outline cursor-not-allowed' 
              : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>description</span>
          Convert to Word Now
        </button>
      )}

      {loading && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-surface-variant border-t-primary animate-spin" />
          <h3 className="text-headline-sm text-on-surface mb-2">Converting to Word...</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Extracting layout, text, and images precisely.</p>
          
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

      {done && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-container rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>check_circle</span>
          </div>
          <h3 className="text-headline-sm text-on-surface mb-2">Conversion Complete!</h3>
          <p className="text-body-md text-on-surface-variant mb-6">Your editable Word document (.docx) has been downloaded.</p>
          
          <button onClick={reset} className="inline-flex items-center gap-2 border border-outline text-on-surface font-bold px-6 py-3 rounded-xl hover:bg-surface-variant transition-colors text-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Convert another file
          </button>
        </div>
      )}
    </div>
  )
}
