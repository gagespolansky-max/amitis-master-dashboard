'use client'

import { useState } from 'react'

interface ManualAddFormProps {
  onAdd: (entry: { summary: string; sender: string; source_app: string; action_items: string[] }) => Promise<void>
}

const SOURCE_OPTIONS = ['Manual', 'Slack', 'Teams', 'Email', 'iMessage', 'WhatsApp', 'Phone', 'In Person']

export default function ManualAddForm({ onAdd }: ManualAddFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [sender, setSender] = useState('')
  const [sourceApp, setSourceApp] = useState('Manual')
  const [actionItem, setActionItem] = useState('')
  const [actionItems, setActionItems] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddAction = () => {
    const trimmed = actionItem.trim()
    if (trimmed) {
      setActionItems((prev) => [...prev, trimmed])
      setActionItem('')
    }
  }

  const handleSubmit = async () => {
    if (!summary.trim()) return
    setIsSubmitting(true)
    try {
      await onAdd({ summary, sender, source_app: sourceApp, action_items: actionItems })
      setSummary('')
      setSender('')
      setSourceApp('Manual')
      setActionItem('')
      setActionItems([])
      setIsOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl border border-dashed border-white/[0.12] hover:border-accent/40 bg-white/[0.02] hover:bg-accent/[0.04] px-5 py-3.5 text-sm text-muted hover:text-accent transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add priority manually
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.02] overflow-hidden">
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted uppercase tracking-wider">New Priority</span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted/60 hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What's the priority?"
          rows={2}
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 resize-none outline-none focus:border-accent/40"
        />

        <div className="flex gap-2">
          <input
            type="text"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="From who? (optional)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/40"
          />
          <select
            value={sourceApp}
            onChange={(e) => setSourceApp(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/40"
          >
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {actionItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {actionItems.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs text-accent bg-accent/[0.08] border border-accent/[0.15] rounded-md pl-2.5 pr-1.5 py-1"
              >
                {item}
                <button
                  onClick={() => setActionItems((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-accent/40 hover:text-red-400 transition-colors ml-0.5"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={actionItem}
            onChange={(e) => setActionItem(e.target.value)}
            placeholder="Add action item (optional)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAddAction() }
            }}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/40"
          />
          {actionItem.trim() && (
            <button
              onClick={handleAddAction}
              className="text-xs text-accent hover:text-accent/80 border border-accent/20 hover:border-accent/40 rounded-lg px-3 py-2 transition-colors"
            >
              + Add
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs text-muted hover:text-foreground px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!summary.trim() || isSubmitting}
            className="text-xs font-medium text-white bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add Priority'}
          </button>
        </div>
      </div>
    </div>
  )
}
