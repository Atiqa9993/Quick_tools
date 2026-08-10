'use client'
import { useState, useCallback } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'
import { jsPDF } from 'jspdf'

export default function ImageToPdfTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const generatePdf = useCallback(async () => {
    if (!loggedIn) { window.location.href = '/auth?redirect=/tools/image-to-pdf'; return }
    if (files.length === 0) return

    setLoading(true)
    setError('')
    setDone(false)

    try {
      const pdf = new jsPDF({ unit: 'px', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < files.length; i++) {
        if (i > 0) pdf.addPage()

        const dataUrl = await readFileAsDataUrl(files[i])
        const dims = await getImageDimensions(dataUrl)

        // Fit image to page while maintaining aspect ratio
        const ratio = Math.min(pageW / dims.width, pageH / dims.height)
        const w = dims.width * ratio
        const h = dims.height * ratio
        const x = (pageW - w) / 2
        const y = (pageH - h) / 2

        const format = files[i].type === 'image/png' ? 'PNG' : 'JPEG'
        pdf.addImage(dataUrl, format, x, y, w, h)
      }

      pdf.save('images-to-pdf.pdf')

      // Update usage
      await fetch('/api/update-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: files.length }),
      })

      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PDF')
    } finally {
      setLoading(false)
    }
  }, [files, loggedIn])

  const reset = () => { setFiles([]); setDone(false); setError('') }

  return (
    <div className="space-y-6">
      {!done && !loading && (
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          acceptLabel="JPG, PNG, WEBP"
          multiple
          maxFiles={20}
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

      {!done && !loading && files.length > 0 && (
        <button onClick={generatePdf} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-orange-200 text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          {loggedIn ? `Create PDF (${files.length} image${files.length > 1 ? 's' : ''})` : 'Sign in to Create PDF'}
        </button>
      )}

      {loading && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-slate-200 border-t-orange-500 animate-spin" />
          <p className="text-sm font-medium text-slate-700">Creating your PDF...</p>
        </div>
      )}

      {done && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">PDF Downloaded!</h3>
          <p className="text-sm text-slate-500 mb-6">Your PDF with {files.length} image{files.length > 1 ? 's' : ''} has been saved.</p>
          <button onClick={reset} className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Create another PDF
          </button>
        </div>
      )}
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = dataUrl
  })
}
