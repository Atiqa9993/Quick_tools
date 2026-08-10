'use client'
import { useState } from 'react'
import { jsPDF } from 'jspdf'

interface ResultPanelProps {
  text: string
  isLoading?: boolean
  loadingText?: string
  progress?: number
  filename?: string
}

export default function ResultPanel({ text, isLoading, loadingText = 'Processing...', progress, filename = 'extracted-text' }: ResultPanelProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportTxt = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const maxLineWidth = pageWidth - margin * 2
    
    doc.setFont("helvetica")
    doc.setFontSize(12)
    
    // Split the text into lines that fit the page width
    const textLines = doc.splitTextToSize(text, maxLineWidth)
    
    let cursorY = margin
    
    textLines.forEach((line: string) => {
      if (cursorY > pageHeight - margin) {
        doc.addPage()
        cursorY = margin
      }
      doc.text(line, margin, cursorY)
      cursorY += 6 // Line height
    })
    
    doc.save(`${filename}.pdf`)
  }

  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-slate-200 border-t-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-700">{loadingText}</p>
        {progress !== undefined && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">{Math.round(progress)}% complete</p>
          </div>
        )}
      </div>
    )
  }

  if (!text) return null

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const charCount = text.length

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">✓ Complete</span>
          <span className="text-xs text-slate-400">{wordCount} words · {charCount} chars</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copyToClipboard} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 hover:text-blue-600 transition-colors">
            {copied ? (
              <><svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Copied!</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy</>
            )}
          </button>
          <button onClick={exportTxt} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 hover:text-blue-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export .txt
          </button>
          <button onClick={exportPdf} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 hover:text-blue-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export PDF
          </button>
        </div>
      </div>
      {/* Content */}
      <div className="p-5 max-h-[400px] overflow-y-auto">
        <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{text}</pre>
      </div>
    </div>
  )
}
