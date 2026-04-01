'use client'

import { useState, useEffect } from 'react'
import type { Note } from '@/components/doodle-pad'

function loadNotes(): Note[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem('enablement-notes')
  return stored ? JSON.parse(stored) : []
}

export default function NotesTab() {
  const [notes, setNotes] = useState<Note[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterTopic, setFilterTopic] = useState<string>('all')

  useEffect(() => {
    setNotes(loadNotes())

    // Listen for storage changes (when notepad updates)
    function handleStorage() {
      setNotes(loadNotes())
    }
    window.addEventListener('storage', handleStorage)

    // Poll for changes from same-tab notepad updates
    const interval = setInterval(() => setNotes(loadNotes()), 2000)
    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  const topics = ['all', ...new Set(notes.map((n) => n.topic).filter(Boolean))]
  const filtered = filterTopic === 'all' ? notes : notes.filter((n) => n.topic === filterTopic)

  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-card-border p-8 text-center">
        <p className="text-sm text-muted mb-2">No notes yet</p>
        <p className="text-xs text-muted/60">
          Click the notepad button in the bottom-right corner to start taking notes as you learn.
          Tag them by topic and they&apos;ll show up here organized for review.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
        <h2 className="text-sm font-medium mb-1">Your Learning Notes</h2>
        <p className="text-xs text-muted">
          Notes captured from the floating notepad, organized by topic. Use the notepad (bottom-right corner)
          to jot things down while taking quizzes or studying.
        </p>
      </div>

      {/* Topic filter */}
      {topics.length > 2 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTopic(t)}
              className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                filterTopic === t
                  ? 'bg-accent text-white'
                  : 'bg-card-bg border border-card-border text-muted hover:text-foreground'
              }`}
            >
              {t === 'all' ? 'All Topics' : t}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((note) => {
          const isExpanded = expandedId === note.id
          const preview = note.content.split('\n').slice(0, 2).join(' ').slice(0, 120)
          const date = new Date(note.updatedAt)

          return (
            <button
              key={note.id}
              onClick={() => setExpandedId(isExpanded ? null : note.id)}
              className={`w-full text-left rounded-xl border p-5 transition-all ${
                isExpanded
                  ? 'border-accent/30 bg-accent/5'
                  : 'border-card-border bg-card-bg hover:border-card-border/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    {note.topic}
                  </span>
                  <span className="text-[10px] text-muted">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' '}
                    {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <svg
                  className={`w-3 h-3 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {isExpanded ? (
                <div className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
                  {note.content || 'Empty note'}
                </div>
              ) : (
                <p className="text-sm text-muted truncate">
                  {preview || 'Empty note'}
                </p>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-[10px] text-muted/50 mt-4 text-center">
        {filtered.length} note{filtered.length !== 1 ? 's' : ''} &middot; Stored locally
      </p>
    </div>
  )
}
