'use client'
import { useState, useMemo } from 'react'

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
  'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
  'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up',
  'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time',
  'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
  'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
  'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were',
  'been', 'has', 'had', 'am', 'is', 'are'
])

const COMMON_ABBREVIATIONS = [
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'e.g', 'i.e', 'u.s', 'inc', 'ltd', 'jan', 'feb',
  'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'st', 'co'
]

export default function WordCounterTool({ loggedIn }: { loggedIn: boolean }) {
  const [text, setText] = useState('')

  const stats = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) {
      return {
        words: 0,
        characters: 0,
        charsNoSpaces: 0,
        sentences: 0,
        paragraphs: 0,
        readingTime: '0 sec',
        speakingTime: '0 sec',
        topKeywords: [],
      }
    }

    // 1. Requirement 1: Filter out purely non-alphanumeric symbols (e.g. "---", "***", "@")
    const rawTokens = trimmed.split(/\s+/)
    const validWordsList = rawTokens
      .map(w => w.replace(/^[^\w\u0600-\u06FF]+|[^\w\u0600-\u06FF]+$/g, ''))
      .filter(w => /[a-zA-Z0-9\u0600-\u06FF]/.test(w))

    const words = validWordsList.length
    const characters = text.length
    const charsNoSpaces = text.replace(/\s/g, '').length

    // 2. Requirement 2: Smart Sentence Parsing (ignores abbreviation periods)
    let sentenceText = text
    COMMON_ABBREVIATIONS.forEach(abbr => {
      const regex = new RegExp(`\\b${abbr}\\.`, 'gi')
      sentenceText = sentenceText.replace(regex, `${abbr}_DOT_`)
    })
    const sentences = sentenceText.split(/[.!?]+/).filter(s => s.trim().length > 0).length

    // Paragraphs
    const paragraphs = trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0).length

    // 3. Requirement 3: Reading Time (200 WPM) & Speaking Time (130 WPM)
    const formatDuration = (wpm: number) => {
      if (words === 0) return '0 sec'
      const mins = words / wpm
      if (mins < 1) return `${Math.max(1, Math.ceil(mins * 60))} sec`
      if (mins < 60) return `${Math.ceil(mins)} min`
      const hrs = Math.floor(mins / 60)
      const remainingMins = Math.ceil(mins % 60)
      return `${hrs}h ${remainingMins}m`
    }

    const readingTime = formatDuration(200)
    const speakingTime = formatDuration(130)

    // 4. Requirement 4: Keyword Density Tracker (Top 5 Non-Stopwords)
    const freqMap: Record<string, number> = {}
    validWordsList.forEach(w => {
      const lower = w.toLowerCase()
      if (lower.length > 1 && !STOP_WORDS.has(lower)) {
        freqMap[lower] = (freqMap[lower] || 0) + 1
      }
    })

    const topKeywords = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({
        word,
        count,
        percentage: words > 0 ? ((count / words) * 100).toFixed(1) : '0',
      }))

    return { words, characters, charsNoSpaces, sentences, paragraphs, readingTime, speakingTime, topKeywords }
  }, [text])

  const statCards = [
    { label: 'Words', value: stats.words, icon: 'text_fields', color: 'text-primary' },
    { label: 'Characters', value: stats.characters, icon: 'abc', color: 'text-primary' },
    { label: 'No Spaces', value: stats.charsNoSpaces, icon: 'space_bar', color: 'text-on-surface' },
    { label: 'Sentences', value: stats.sentences, icon: 'short_text', color: 'text-on-surface' },
    { label: 'Paragraphs', value: stats.paragraphs, icon: 'notes', color: 'text-on-surface' },
    { label: 'Reading Time', value: stats.readingTime, icon: 'timer', color: 'text-on-surface' },
    { label: 'Speaking Time', value: stats.speakingTime, icon: 'record_voice_over', color: 'text-on-surface' },
  ]

  const clearText = () => setText('')

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {statCards.map(card => (
          <div
            key={card.label}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-center shadow-sm"
          >
            <span className={`material-symbols-outlined ${card.color} mb-1`} style={{ fontSize: 20 }}>
              {card.icon}
            </span>
            <p className={`text-base sm:text-lg font-bold ${card.color} truncate`}>
              {card.value}
            </p>
            <p className="text-[10px] sm:text-xs text-on-surface-variant font-medium mt-0.5 truncate">
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
          placeholder="Paste or type your text here to count words, characters, sentences, reading & speaking time, and keyword density..."
          className="w-full min-h-[280px] sm:min-h-[350px] bg-transparent text-on-surface text-sm leading-relaxed p-5 outline-none resize-y placeholder:text-on-surface-variant/50 font-[inherit]"
          autoFocus
        />
      </div>

      {/* Requirement 4: Top Keywords Density Section */}
      {stats.topKeywords.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>analytics</span>
            Top Keywords Density
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stats.topKeywords.map(kw => (
              <div
                key={kw.word}
                className="bg-surface-container/50 border border-outline-variant/60 rounded-xl p-3 flex flex-col justify-between"
              >
                <span className="text-sm font-bold text-on-surface capitalize truncate mb-1">
                  {kw.word}
                </span>
                <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-mono">
                    {kw.count}×
                  </span>
                  <span className="text-[11px]">
                    {kw.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
