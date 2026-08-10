'use client'
import { useState, useCallback } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'

export default function MergePdfTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  const maxFiles = loggedIn ? 20 : 3

  const mergePdfs = useCallback(async () => {
    if (files.length < 2) {
      setError('Please select at least 2 PDF files to merge.')
      return
    }

    setLoading(true)
    setError('')
    setDone(false)
    setProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 5, 90))
      }, 500)

      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch('http://127.0.0.1:8000/api/tools/merge-pdf', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to merge PDFs on the server.')
      }

      const blob = await response.blob()
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merged_document.pdf`
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to merge PDFs')
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
          acceptLabel={`PDF files (Max ${maxFiles} for ${loggedIn ? 'Pro' : 'Free'})`}
          multiple={true}
          maxFiles={maxFiles}
          files={files}
          onFilesChange={(newFiles) => {
            if (newFiles.length > maxFiles && !loggedIn) {
              setError(`Free users can only merge up to ${maxFiles} files. Please sign in to merge more.`)
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

      {!done && !loading && files.length > 0 && (
        <button 
          onClick={mergePdfs} 
          disabled={!!error || files.length < 2}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-colors shadow-sm text-sm tracking-wide ${
            error || files.length < 2
              ? 'bg-surface-variant text-outline cursor-not-allowed' 
              : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>call_merge</span>
          Merge PDF Now
        </button>
      )}

      {!done && !loading && files.length === 1 && !error && (
        <p className="text-sm text-on-surface-variant text-center">Add at least 1 more file to merge.</p>
      )}

      {loading && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-surface-variant border-t-primary animate-spin" />
          <h3 className="text-headline-sm text-on-surface mb-2">Merging PDFs...</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Combining {files.length} documents in sequence.</p>
          
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
          <h3 className="text-headline-sm text-on-surface mb-2">Merge Complete!</h3>
          <p className="text-body-md text-on-surface-variant mb-6">Your combined PDF has been downloaded.</p>
          
          <button onClick={reset} className="inline-flex items-center gap-2 border border-outline text-on-surface font-bold px-6 py-3 rounded-xl hover:bg-surface-variant transition-colors text-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Merge more files
          </button>
        </div>
      )}
    </div>
  )
}
