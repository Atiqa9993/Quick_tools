'use client'
import { useState } from 'react'

const CASES = [
  { key: 'upper',    label: 'UPPERCASE',      icon: 'keyboard_capslock', example: 'HELLO WORLD' },
  { key: 'lower',    label: 'lowercase',      icon: 'keyboard',          example: 'hello world' },
  { key: 'title',    label: 'Title Case',     icon: 'title',             example: 'Hello World' },
  { key: 'sentence', label: 'Sentence case',  icon: 'short_text',        example: 'Hello world. This is text.' },
  { key: 'toggle',   label: 'tOGGLE cASE',    icon: 'swap_vert',         example: 'hELLO wORLD' },
  { key: 'camel',    label: 'camelCase',       icon: 'code',              example: 'helloWorld' },
]

function convertCase(text: string, caseType: string): string {
  switch (caseType) {
    case 'upper':
      return text.toUpperCase()
    case 'lower':
      return text.toLowerCase()
    case 'title':
      return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    case 'sentence':
      return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase())
    case 'toggle':
      return text.split('').map(c =>
        c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()
      ).join('')
    case 'camel':
      return text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    default:
      return text
  }
}

export default function CaseConverterTool({ loggedIn }: { loggedIn: boolean }) {
  const [text, setText] = useState('')
  const [activeCase, setActiveCase] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const result = activeCase ? convertCase(text, activeCase) : text

  const copyResult = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clearAll = () => {
    setText('')
    setActiveCase(null)
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container border-b border-outline-variant">
          <span className="text-xs font-bold text-on-surface-variant">
            {text.length > 0 ? `${text.trim().split(/\s+/).filter(Boolean).length} words · ${text.length} characters` : 'Paste or type your text below'}
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
          placeholder="Type or paste your text here..."
          className="w-full min-h-[160px] bg-transparent text-on-surface text-sm leading-relaxed p-5 outline-none resize-y placeholder:text-on-surface-variant/50 font-[inherit]"
          autoFocus
        />
      </div>

      {/* Case Buttons */}
      {text.trim().length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CASES.map(c => {
            const isActive = activeCase === c.key
            return (
              <button
                key={c.key}
                onClick={() => setActiveCase(c.key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-outline-variant/60 hover:border-primary/40 hover:bg-surface-container cursor-pointer'
                }`}
              >
                <span
                  className={`material-symbols-outlined ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}
                  style={{ fontSize: 22 }}
                >
                  {c.icon}
                </span>
                <span className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                  {c.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Result */}
      {text.trim().length > 0 && activeCase && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container border-b border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {CASES.find(c => c.key === activeCase)?.label}
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
