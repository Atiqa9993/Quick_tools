'use client'
import { useState } from 'react'

const MODES = [
  { key: 'single',     label: 'Remove Line Breaks',       icon: 'wrap_text',        desc: 'Join all lines into one paragraph' },
  { key: 'double',     label: 'Remove Empty Lines',       icon: 'density_small',    desc: 'Keep paragraphs, remove blank lines' },
  { key: 'trim',       label: 'Trim Whitespace',          icon: 'format_align_left', desc: 'Remove extra spaces from each line' },
  { key: 'compress',   label: 'Compress Spaces',          icon: 'compress',          desc: 'Replace multiple spaces with one' },
]

function processText(text: string, mode: string): string {
  switch (mode) {
    case 'single':
      // Replace all line breaks with a single space
      return text.replace(/\n+/g, ' ').replace(/ {2,}/g, ' ').trim()
    case 'double':
      // Remove blank/empty lines but keep single line breaks
      return text.replace(/\n{3,}/g, '\n\n').replace(/^\s*\n/gm, '').trim()
    case 'trim':
      // Trim leading/trailing whitespace from each line
      return text.split('\n').map(line => line.trim()).join('\n').trim()
    case 'compress':
      // Replace multiple consecutive spaces with single space
      return text.replace(/[^\S\n]+/g, ' ').trim()
    default:
      return text
  }
}

export default function RemoveLineBreaksTool({ loggedIn }: { loggedIn: boolean }) {
  const [text, setText] = useState('')
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const result = activeMode ? processText(text, activeMode) : ''

  const lineCount = text.split('\n').length
  const emptyLines = text.split('\n').filter(l => l.trim() === '').length

  const copyResult = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clearAll = () => {
    setText('')
    setActiveMode(null)
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container border-b border-outline-variant">
          <span className="text-xs font-bold text-on-surface-variant">
            {text.length > 0 ? `${lineCount} lines · ${emptyLines} empty lines · ${text.length} characters` : 'Paste your messy text below'}
          </span>
          {text.length > 0 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-error transition-colors px-2 py-1 rounded-lg hover:bg-error-container"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              Clear
            </button>
          )}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Paste text with unwanted line breaks here...\n\nFor example, text copied from\na PDF often has line breaks\nin the middle of sentences.\n\nThis tool will fix that for you."}
          className="w-full min-h-[200px] bg-transparent text-on-surface text-sm leading-relaxed p-5 outline-none resize-y placeholder:text-on-surface-variant/50 font-[inherit]"
          autoFocus
        />
      </div>

      {/* Mode Buttons */}
      {text.trim().length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODES.map(m => {
            const isActive = activeMode === m.key
            return (
              <button
                key={m.key}
                onClick={() => setActiveMode(m.key)}
                className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all text-center ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-outline-variant/60 hover:border-primary/40 hover:bg-surface-container cursor-pointer'
                }`}
              >
                <span
                  className={`material-symbols-outlined ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}
                  style={{ fontSize: 22 }}
                >
                  {m.icon}
                </span>
                <span className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                  {m.label}
                </span>
                <span className="text-[10px] text-on-surface-variant leading-tight hidden sm:block">
                  {m.desc}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container border-b border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {MODES.find(m => m.key === activeMode)?.label}
              </span>
              <span className="text-xs text-on-surface-variant">
                {result.split('\n').length} lines · {result.length} chars
              </span>
            </div>
            <button
              onClick={copyResult}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-variant text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="p-5 max-h-[300px] overflow-y-auto">
            <pre className="text-sm text-on-surface whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
