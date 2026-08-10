'use client'
import { useState, useMemo } from 'react'

export default function WordCounterTool({ loggedIn }: { loggedIn: boolean }) {
  const [text, setText] = useState('')

  const stats = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) {
      return { words: 0, characters: 0, charsNoSpaces: 0, sentences: 0, paragraphs: 0, readingTime: '0 sec' }
    }

    const words = trimmed.split(/\s+/).filter(Boolean).length
    const characters = text.length
    const charsNoSpaces = text.replace(/\s/g, '').length
    const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    const paragraphs = trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0).length

    // Average reading speed: 200 words per minute
    const minutes = words / 200
    let readingTime = ''
    if (minutes < 1) {
      readingTime = `${Math.max(1, Math.ceil(minutes * 60))} sec`
    } else if (minutes < 60) {
      readingTime = `${Math.ceil(minutes)} min`
    } else {
      const hrs = Math.floor(minutes / 60)
      const mins = Math.ceil(minutes % 60)
      readingTime = `${hrs}h ${mins}m`
    }

    return { words, characters, charsNoSpaces, sentences, paragraphs, readingTime }
  }, [text])

  const statCards = [
    { label: 'Words', value: stats.words, icon: 'text_fields', color: 'text-primary' },
    { label: 'Characters', value: stats.characters, icon: 'abc', color: 'text-primary' },
    { label: 'No Spaces', value: stats.charsNoSpaces, icon: 'space_bar', color: 'text-on-surface' },
    { label: 'Sentences', value: stats.sentences, icon: 'short_text', color: 'text-on-surface' },
    { label: 'Paragraphs', value: stats.paragraphs, icon: 'notes', color: 'text-on-surface' },
    { label: 'Reading Time', value: stats.readingTime, icon: 'timer', color: 'text-on-surface' },
  ]

  const clearText = () => setText('')

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {statCards.map(card => (
          <div
            key={card.label}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-center shadow-sm"
          >
            <span className={`material-symbols-outlined ${card.color} mb-1`} style={{ fontSize: 20 }}>
              {card.icon}
            </span>
            <p className={`text-lg sm:text-xl font-bold ${card.color}`}>
              {card.value}
            </p>
            <p className="text-[10px] sm:text-xs text-on-surface-variant font-medium mt-0.5">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Text Area */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container border-b border-outline-variant">
          <span className="text-xs font-bold text-on-surface-variant">
            {text.length > 0 ? `${stats.words} words · ${stats.characters} characters` : 'Start typing or paste your text below'}
          </span>
          {text.length > 0 && (
            <button
              onClick={clearText}
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
          placeholder="Paste or type your text here to count words, characters, sentences, and more..."
          className="w-full min-h-[300px] sm:min-h-[400px] bg-transparent text-on-surface text-sm leading-relaxed p-5 outline-none resize-y placeholder:text-on-surface-variant/50 font-[inherit]"
          autoFocus
        />
      </div>
    </div>
  )
}
