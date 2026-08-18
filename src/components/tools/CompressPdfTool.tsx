'use client'
import { useState, useCallback } from 'react'
import FileDropzone from '@/components/tools/FileDropzone'

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CompressPdfTool({ loggedIn }: { loggedIn: boolean }) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  
  // Settings
  const [mode, setMode] = useState<'quick' | 'exact'>('quick')
  const [level, setLevel] = useState<'low' | 'medium' | 'extreme'>('medium')
  
  // Exact Size Settings
  const [targetValue, setTargetValue] = useState<string>('200')
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('KB')
  
  const [stats, setStats] = useState({ oldSize: 0, newSize: 0 })

  const compressPdf = useCallback(async () => {
    if (files.length === 0) return

    setLoading(true)
    setError('')
    setDone(false)
    setProgress(0)

    try {
      const file = files[0]
      
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 15, 90))
      }, 500)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('level', level)
      
      if (mode === 'exact') {
        const valueNum = parseFloat(targetValue)
        if (isNaN(valueNum) || valueNum <= 0) {
          throw new Error("Please enter a valid target size.")
        }
        let targetKb = targetUnit === 'MB' ? Math.round(valueNum * 1024) : Math.round(valueNum)
        formData.append('target_size_kb', targetKb.toString())
      }

      const response = await fetch('http://127.0.0.1:8000/api/tools/compress-pdf', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to compress PDF on the server.')
      }

      const rawBlob = await response.blob()
      const blob = new Blob([rawBlob], { type: 'application/pdf' })

      setStats({
        oldSize: file.size,
        newSize: blob.size
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const originalName = file.name || 'document.pdf'
      const downloadName = originalName.toLowerCase().endsWith('.pdf')
        ? `compressed-${originalName}`
        : `compressed-${originalName}.pdf`
      a.download = downloadName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDone(true)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to compress PDF')
    } finally {
      setLoading(false)
    }
  }, [files, level, mode, targetValue, targetUnit])

  const reset = () => { setFiles([]); setDone(false); setError(''); setProgress(0) }

  return (
    <div className="space-y-6">
      {!done && !loading && (
        <>
          <FileDropzone
            accept="application/pdf"
            acceptLabel="PDF files (Max 5MB for Free)"
            maxFiles={1}
            files={files}
            onFilesChange={(newFiles) => {
              if (newFiles.length > 0 && newFiles[0].size > 5 * 1024 * 1024 && !loggedIn) {
                setError('File exceeds the 5MB limit for free users. Please sign in to compress larger files.')
                setFiles([])
              } else {
                setError('')
                setFiles(newFiles)
                if (level === 'extreme' && !loggedIn) {
                  setLevel('medium')
                }
              }
            }}
          />

          {files.length > 0 && (
            <div className="bg-surface-container p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-2">
                <h4 className="text-label-md text-on-surface font-bold uppercase tracking-wider">Compression Mode</h4>
                <div className="flex bg-surface-container-highest rounded-lg p-1">
                  <button 
                    onClick={() => setMode('quick')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'quick' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Quick Options
                  </button>
                  <button 
                    onClick={() => setMode('exact')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${mode === 'exact' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">tune</span>
                    Exact Size
                  </button>
                </div>
              </div>

              {mode === 'quick' ? (
                <div className="flex gap-3">
                  {[
                    { id: 'low', label: 'Low', desc: 'High quality, less compression' },
                    { id: 'medium', label: 'Medium', desc: 'Good balance (Recommended)' },
                    { id: 'extreme', label: 'Extreme', desc: 'Lowest quality, smallest size' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (opt.id === 'extreme' && !loggedIn) {
                          setError('Extreme compression is a Premium feature. Please sign in to use this.')
                          return
                        }
                        setError('')
                        setLevel(opt.id as any)
                      }}
                      className={`relative flex-1 flex flex-col p-3 rounded-lg border text-left transition-all ${
                        level === opt.id 
                          ? 'bg-primary-container border-primary text-on-primary-container' 
                          : 'bg-surface-container-lowest border-outline-variant hover:border-outline text-on-surface'
                      } ${opt.id === 'extreme' && !loggedIn ? 'opacity-70' : ''}`}
                    >
                      <span className="font-bold text-sm mb-1 flex items-center gap-1">
                        {opt.label}
                        {opt.id === 'extreme' && !loggedIn && <span className="material-symbols-outlined text-[14px] text-amber-500">lock</span>}
                      </span>
                      <span className="text-xs opacity-80 leading-snug">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex-1">
                    <h5 className="font-bold text-on-surface mb-1">Target File Size</h5>
                    <p className="text-sm text-on-surface-variant">Our AI will smartly adjust quality to hit this exact size.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="1"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-24 px-4 py-2 bg-surface border border-outline-variant rounded-lg text-center font-bold text-on-surface focus:outline-none focus:border-primary"
                    />
                    <select 
                      value={targetUnit}
                      onChange={(e) => setTargetUnit(e.target.value as 'KB' | 'MB')}
                      className="px-4 py-2 bg-surface border border-outline-variant rounded-lg font-bold text-on-surface focus:outline-none focus:border-primary appearance-none pr-8 relative cursor-pointer"
                      style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                    >
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl border border-error/20">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
          {error}
        </div>
      )}

      {!done && !loading && files.length > 0 && (
        <button 
          onClick={compressPdf} 
          disabled={!!error}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-colors shadow-sm text-sm tracking-wide ${
            error 
              ? 'bg-surface-variant text-outline cursor-not-allowed' 
              : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>compress</span>
          Compress PDF Now
        </button>
      )}

      {loading && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-surface-variant border-t-primary animate-spin" />
          <h3 className="text-headline-sm text-on-surface mb-2">
            {mode === 'exact' ? 'Optimizing to exact target size...' : 'Compressing your PDF...'}
          </h3>
          <p className="text-body-sm text-on-surface-variant mb-6">
            {mode === 'exact' ? 'Smart algorithm is adjusting quality parameters.' : 'Flattening images and reducing metadata.'}
          </p>
          
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
          <h3 className="text-headline-sm text-on-surface mb-2">Compression Complete!</h3>
          <p className="text-body-md text-on-surface-variant mb-6">Your optimized PDF has been downloaded.</p>
          
          <div className="flex items-center justify-center gap-6 bg-surface-container py-4 rounded-xl mb-6 mx-auto max-w-sm">
            <div className="text-center">
              <p className="text-xs text-outline font-bold uppercase tracking-wider mb-1">Original Size</p>
              <p className="text-lg text-on-surface font-semibold">{formatSize(stats.oldSize)}</p>
            </div>
            <span className="material-symbols-outlined text-outline-variant">arrow_forward</span>
            <div className="text-center">
              <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">New Size</p>
              <p className="text-lg text-primary font-bold">{formatSize(stats.newSize)}</p>
            </div>
          </div>

          <button onClick={reset} className="inline-flex items-center gap-2 border border-outline text-on-surface font-bold px-6 py-3 rounded-xl hover:bg-surface-variant transition-colors text-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Compress another file
          </button>
        </div>
      )}
    </div>
  )
}
