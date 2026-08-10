'use client'
import { useState, useCallback } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'

export default function SplitPdfTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  // Tabs: range, pages, size
  const [activeTab, setActiveTab] = useState<'range' | 'pages' | 'size'>('range')

  // Range options
  const [rangeMode, setRangeMode] = useState<'custom' | 'fixed'>('custom')
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [fixedPages, setFixedPages] = useState('1')

  // Pages options
  const [pagesMode, setPagesMode] = useState<'all' | 'select'>('all')
  const [selectedPages, setSelectedPages] = useState('')

  // Size options
  const [targetSizeMb, setTargetSizeMb] = useState('10')

  const splitPdf = useCallback(async () => {
    if (files.length !== 1) {
      setError('Please upload exactly 1 PDF file.')
      return
    }

    if (activeTab === 'size' && !loggedIn) {
      setError('Splitting by size is a Pro feature. Please sign in.')
      return
    }

    if (activeTab === 'range' && rangeMode === 'custom') {
      if (!rangeFrom.trim() || !rangeTo.trim()) {
        setError('Please enter both From and To page numbers.')
        return
      }
      if (parseInt(rangeFrom) > parseInt(rangeTo)) {
        setError('"From" page cannot be greater than "To" page.')
        return
      }
    }
    
    if (activeTab === 'range' && rangeMode === 'fixed' && (!fixedPages || parseInt(fixedPages) < 1)) {
      setError('Please enter a valid number of pages to split by.')
      return
    }

    if (activeTab === 'pages' && pagesMode === 'select' && !selectedPages.trim()) {
      setError('Please enter which pages you want to extract.')
      return
    }

    if (activeTab === 'size' && (!targetSizeMb || parseFloat(targetSizeMb) <= 0)) {
      setError('Please enter a valid size in MB.')
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
      formData.append('file', files[0])
      formData.append('tab', activeTab)
      
      if (activeTab === 'range') {
        formData.append('range_mode', rangeMode)
        if (rangeMode === 'custom') {
          formData.append('range_from', rangeFrom)
          formData.append('range_to', rangeTo)
        }
        if (rangeMode === 'fixed') formData.append('fixed_pages', fixedPages)
      } else if (activeTab === 'pages') {
        formData.append('pages_mode', pagesMode)
        if (pagesMode === 'select') formData.append('selected_pages', selectedPages)
      } else if (activeTab === 'size') {
        formData.append('target_size_mb', targetSizeMb)
      }

      const response = await fetch('http://127.0.0.1:8000/api/tools/split-pdf', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to split PDF on the server.')
      }

      const contentDisposition = response.headers.get('Content-Disposition') || ''
      let filename = 'split_document.zip'
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch && filenameMatch.length === 2) {
        filename = filenameMatch[1]
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to split PDF')
    } finally {
      setLoading(false)
    }
  }, [files, activeTab, rangeMode, rangeFrom, rangeTo, fixedPages, pagesMode, selectedPages, targetSizeMb, loggedIn])

  const reset = () => { setFiles([]); setDone(false); setError(''); setProgress(0) }

  return (
    <div className="space-y-6">
      {!done && !loading && (
        <FileDropzone
          accept="application/pdf"
          acceptLabel="PDF file (Max 1 file)"
          multiple={false}
          files={files}
          onFilesChange={(newFiles) => {
            setError('')
            setFiles(newFiles.slice(0, 1)) // Enforce 1 file
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
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
          {/* Main Tabs */}
          <div className="flex border-b border-outline-variant bg-surface-container-low">
            <button
              onClick={() => setActiveTab('range')}
              className={`flex-1 py-4 text-sm font-bold border-b-2 flex flex-col items-center gap-1 transition-colors ${activeTab === 'range' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:bg-surface-container'}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>straighten</span>
              Cut Sections
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`flex-1 py-4 text-sm font-bold border-b-2 flex flex-col items-center gap-1 transition-colors ${activeTab === 'pages' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:bg-surface-container'}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>file_copy</span>
              Take Out Pages
            </button>
            <button
              onClick={() => setActiveTab('size')}
              className={`flex-1 py-4 text-sm font-bold border-b-2 flex flex-col items-center gap-1 transition-colors relative ${activeTab === 'size' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:bg-surface-container'}`}
            >
              <span className="absolute top-2 right-2 text-amber-500 material-symbols-outlined" style={{ fontSize: 16 }}>hotel_class</span>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>data_usage</span>
              Auto-Split by Size
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* RANGE TAB */}
            {activeTab === 'range' && (
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-surface-container rounded-lg">
                  <button onClick={() => setRangeMode('custom')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${rangeMode === 'custom' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Select a Range</button>
                  <button onClick={() => setRangeMode('fixed')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${rangeMode === 'fixed' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Fixed Chunks</button>
                </div>
                
                {rangeMode === 'custom' && (
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-2">Select a Range</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-xs text-on-surface-variant mb-1">From page</label>
                        <input 
                          type="number" 
                          min="1"
                          value={rangeFrom}
                          onChange={(e) => setRangeFrom(e.target.value)}
                          placeholder="e.g. 1" 
                          className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-on-surface-variant mb-1">To page</label>
                        <input 
                          type="number" 
                          min="1"
                          value={rangeTo}
                          onChange={(e) => setRangeTo(e.target.value)}
                          placeholder="e.g. 5" 
                          className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-2">Only the pages between these two numbers will be extracted into a new PDF.</p>
                  </div>
                )}
                {rangeMode === 'fixed' && (
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-2">Split into chunks of (pages)</label>
                    <input 
                      type="number" 
                      min="1"
                      value={fixedPages}
                      onChange={(e) => setFixedPages(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-xs text-on-surface-variant mt-2">The document will be split evenly into multiple PDFs of this exact page length.</p>
                  </div>
                )}
              </div>
            )}

            {/* PAGES TAB */}
            {activeTab === 'pages' && (
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-surface-container rounded-lg">
                  <button onClick={() => setPagesMode('all')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${pagesMode === 'all' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Separate All Pages</button>
                  <button onClick={() => setPagesMode('select')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${pagesMode === 'select' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Select Specific Pages</button>
                </div>

                {pagesMode === 'all' && (
                  <div className="bg-surface p-4 rounded-xl border border-outline-variant text-center">
                    <p className="text-sm font-medium text-on-surface">Every page will be converted into a separate PDF file.</p>
                    <p className="text-xs text-on-surface-variant mt-1">If your PDF has 10 pages, you will get a ZIP file containing 10 PDFs.</p>
                  </div>
                )}
                {pagesMode === 'select' && (
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-2">Pages to extract</label>
                    <input 
                      type="text" 
                      value={selectedPages}
                      onChange={(e) => setSelectedPages(e.target.value)}
                      placeholder="Example: 1, 3, 5-8" 
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-xs text-on-surface-variant mt-2">Selected pages will be extracted and merged into a single new PDF document.</p>
                  </div>
                )}
              </div>
            )}

            {/* SIZE TAB */}
            {activeTab === 'size' && (
              <div className="space-y-4 relative">
                {!loggedIn && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm rounded-xl">
                    <span className="material-symbols-outlined text-amber-500 mb-2" style={{ fontSize: 32 }}>hotel_class</span>
                    <p className="text-sm font-bold text-on-surface">Premium Feature</p>
                    <a href="/auth?redirect=/tools/split-pdf" className="text-xs text-primary font-bold mt-1 hover:underline">Sign in to unlock</a>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Maximum file size (MB)</label>
                  <input 
                    type="number" 
                    min="1"
                    disabled={!loggedIn}
                    value={targetSizeMb}
                    onChange={(e) => setTargetSizeMb(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                  <p className="text-xs text-on-surface-variant mt-2">We will automatically split the document at the exact page limits so that no resulting file is larger than this size.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!done && !loading && files.length === 1 && (
        <button 
          onClick={splitPdf} 
          disabled={!!error || (activeTab === 'size' && !loggedIn)}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-colors shadow-sm text-sm tracking-wide ${
            error || (activeTab === 'size' && !loggedIn)
              ? 'bg-surface-variant text-outline cursor-not-allowed' 
              : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>call_split</span>
          Split PDF
        </button>
      )}

      {loading && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-surface-variant border-t-primary animate-spin" />
          <h3 className="text-headline-sm text-on-surface mb-2">Splitting PDF...</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Processing your document according to your settings.</p>
          
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
          <h3 className="text-headline-sm text-on-surface mb-2">Split Complete!</h3>
          <p className="text-body-md text-on-surface-variant mb-6">Your split PDFs have been downloaded.</p>
          
          <button onClick={reset} className="inline-flex items-center gap-2 border border-outline text-on-surface font-bold px-6 py-3 rounded-xl hover:bg-surface-variant transition-colors text-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Split another file
          </button>
        </div>
      )}
    </div>
  )
}
