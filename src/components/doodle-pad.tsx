'use client'

import { useState, useRef, useEffect } from 'react'

export interface Note {
  id: string
  content: string
  topic: string
  createdAt: string
  updatedAt: string
}

function loadNotes(): Note[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem('enablement-notes')
  return stored ? JSON.parse(stored) : []
}

function saveNotes(notes: Note[]) {
  localStorage.setItem('enablement-notes', JSON.stringify(notes))
}

export default function DoodlePad() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [topic, setTopic] = useState('')
  const [showList, setShowList] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Drag state
  const [position, setPosition] = useState({ x: -1, y: -1 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const loaded = loadNotes()
    setNotes(loaded)
    if (position.x === -1) {
      setPosition({ x: window.innerWidth - 440, y: window.innerHeight - 480 })
    }
  }, [position.x])

  function createNote() {
    const note: Note = {
      id: Date.now().toString(),
      content: '',
      topic: 'General',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [note, ...notes]
    setNotes(updated)
    saveNotes(updated)
    setActiveNoteId(note.id)
    setContent('')
    setTopic('General')
    setShowList(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function updateNote() {
    if (!activeNoteId) return
    const updated = notes.map((n) =>
      n.id === activeNoteId
        ? { ...n, content, topic, updatedAt: new Date().toISOString() }
        : n
    )
    setNotes(updated)
    saveNotes(updated)
  }

  function deleteNote(id: string) {
    const updated = notes.filter((n) => n.id !== id)
    setNotes(updated)
    saveNotes(updated)
    if (activeNoteId === id) {
      setActiveNoteId(null)
      setContent('')
      setTopic('')
    }
  }

  function openNote(note: Note) {
    // Save current note first
    if (activeNoteId) updateNote()
    setActiveNoteId(note.id)
    setContent(note.content)
    setTopic(note.topic)
    setShowList(false)
  }

  // Drag handlers
  function handleDragStart(e: React.MouseEvent) {
    setDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }

  useEffect(() => {
    function handleDragMove(e: MouseEvent) {
      if (!dragging) return
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      })
    }
    function handleDragEnd() {
      setDragging(false)
    }

    if (dragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [dragging])

  // Save on blur
  useEffect(() => {
    return () => {
      if (activeNoteId) updateNote()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId, content, topic])

  // Floating button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-6 top-20 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-all hover:bg-accent-hover"
        title="Open Notepad"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </button>
    )
  }

  // Minimized state
  if (minimized) {
    return (
      <div
        className="fixed z-50 rounded-lg bg-card-bg border border-card-border shadow-xl"
        style={{ left: position.x, top: position.y }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 cursor-move select-none"
          onMouseDown={handleDragStart}
        >
          <span className="text-xs font-medium">Notepad</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinimized(false)} className="text-muted hover:text-foreground p-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
            <button onClick={() => { if (activeNoteId) updateNote(); setOpen(false) }} className="text-muted hover:text-red-400 p-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed z-50 rounded-xl bg-card-bg border border-card-border shadow-2xl flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: 420,
        height: 460,
      }}
    >
      {/* Title bar — draggable */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-card-border cursor-move select-none shrink-0"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Notepad</span>
          {activeNoteId && (
            <span className="text-[10px] text-muted">{topic || 'Untitled'}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="text-muted hover:text-foreground p-1" title="Minimize">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button onClick={() => { if (activeNoteId) updateNote(); setOpen(false) }} className="text-muted hover:text-red-400 p-1" title="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-card-border shrink-0">
        <button
          onClick={createNote}
          className="text-[10px] text-accent hover:text-accent-hover px-2 py-1 rounded hover:bg-accent/10 font-medium"
        >
          + New Note
        </button>
        <button
          onClick={() => setShowList(!showList)}
          className={`text-[10px] px-2 py-1 rounded font-medium ${
            showList ? 'bg-accent/20 text-accent' : 'text-muted hover:text-foreground hover:bg-white/5'
          }`}
        >
          All Notes ({notes.length})
        </button>
        {activeNoteId && (
          <button
            onClick={() => { updateNote(); setActiveNoteId(null); setContent(''); setTopic('') }}
            className="text-[10px] text-muted hover:text-foreground px-2 py-1 rounded hover:bg-white/5 ml-auto"
          >
            Save & Close
          </button>
        )}
      </div>

      {/* Notes list */}
      {showList && (
        <div className="border-b border-card-border max-h-48 overflow-y-auto shrink-0">
          {notes.length === 0 ? (
            <p className="text-[10px] text-muted p-3 text-center">No notes yet. Click &quot;+ New Note&quot; to start.</p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`flex items-center justify-between px-3 py-2 border-b border-card-border/50 cursor-pointer transition-colors ${
                  note.id === activeNoteId ? 'bg-accent/10' : 'hover:bg-white/5'
                }`}
                onClick={() => openNote(note)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                      {note.topic}
                    </span>
                    <span className="text-[10px] text-muted">
                      {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted truncate mt-0.5">
                    {note.content.slice(0, 80) || 'Empty note'}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                  className="text-[10px] text-muted hover:text-red-400 p-1 ml-2 shrink-0"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Note editor */}
      {activeNoteId ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-card-border/50 shrink-0">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onBlur={updateNote}
              placeholder="Topic (e.g., RAG, Prompt Engineering, MCP...)"
              className="w-full text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted/50"
            />
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={updateNote}
            placeholder="Write your notes here... Key takeaways, things to remember, questions to explore..."
            className="flex-1 w-full px-3 py-2 bg-transparent text-sm resize-none outline-none text-foreground placeholder:text-muted/40 leading-relaxed"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted mb-2">Capture your learning</p>
            <p className="text-xs text-muted/60 mb-4 max-w-[280px]">
              Take notes as you go through quizzes and labs. Tag them by topic to review later.
            </p>
            <button
              onClick={createNote}
              className="text-xs text-accent hover:text-accent-hover font-medium px-3 py-1.5 rounded-lg border border-accent/20 hover:border-accent/40 transition-colors"
            >
              + New Note
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
