'use client'
import { useCallback, useState, useRef, DragEvent } from 'react'

interface FileDropzoneProps {
  accept: string
  acceptLabel: string
  multiple?: boolean
  maxFiles?: number
  files: File[]
  onFilesChange: (files: File[]) => void
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileDropzone({
  accept, acceptLabel, multiple = false, maxFiles = 1, files, onFilesChange,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    onFilesChange(multiple ? [...files, ...dropped].slice(0, maxFiles) : dropped.slice(0, 1))
  }, [files, maxFiles, multiple, onFilesChange])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    onFilesChange(multiple ? [...files, ...selected].slice(0, maxFiles) : selected.slice(0, 1))
    e.target.value = ''
  }

  const removeFile = (index: number) => onFilesChange(files.filter((_, i) => i !== index))

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
            : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 bg-slate-50/30 dark:bg-slate-900/30'
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleInput} className="hidden" />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors border ${
            isDragging
              ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-xs'
          }`}>
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Drag &amp; drop {multiple ? 'files' : 'a file'} here
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              or <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline">click to browse</span>
            </p>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1 rounded-full shadow-2xs">
            {acceptLabel}{multiple ? ` · Up to ${maxFiles} files` : ''}
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-xs">
              {file.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-10 h-10 bg-red-100 dark:bg-red-950/60 rounded-lg flex items-center justify-center flex-shrink-0 border border-red-200 dark:border-red-900">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatSize(file.size)}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeFile(i) }} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
