'use client'

import { useState } from 'react'
import QuizPortal from '../quiz/_components/quiz-portal'
import ArchitectureLab from '../lab/_components/architecture-lab'
import NotesTab from './notes-tab'
import LearningLogTab from '../learning-log/_components/learning-log-tab'

interface Suggestion {
  date: string
  type: string
  title: string
  description: string
  status: string
}

interface WeeklyReport {
  week: string
  suggestions: Suggestion[]
}

interface EnablementTabsProps {
  pending: Suggestion[]
  reports: WeeklyReport[]
}

const typeStyles: Record<string, string> = {
  Skill: 'bg-accent/10 text-accent',
  Workflow: 'bg-success/10 text-success',
  Automation: 'bg-warning/10 text-warning',
  Feature: 'bg-purple-500/10 text-purple-400',
}

const statusIcons: Record<string, string> = {
  done: 'bg-success',
  pending: 'bg-warning',
  dismissed: 'bg-muted',
}

export default function EnablementTabs({ pending, reports }: EnablementTabsProps) {
  const [tab, setTab] = useState<'quiz' | 'lab' | 'notes' | 'learning-log' | 'reports'>('quiz')

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-card-bg border border-card-border w-fit">
        <button
          onClick={() => setTab('quiz')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'quiz' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
          }`}
        >
          Daily Quiz
        </button>
        <button
          onClick={() => setTab('lab')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'lab' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
          }`}
        >
          Architecture Lab
        </button>
        <button
          onClick={() => setTab('notes')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'notes' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
          }`}
        >
          Notes
        </button>
        <button
          onClick={() => setTab('learning-log')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'learning-log' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
          }`}
        >
          Learning Log
        </button>
        <button
          onClick={() => setTab('reports')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'reports' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
          }`}
        >
          Weekly Reports
          {pending.length > 0 && (
            <span className="ml-1.5 bg-warning/20 text-warning text-[10px] px-1.5 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </button>
      </div>

      {/* Quiz tab */}
      {tab === 'quiz' && <QuizPortal />}

      {/* Architecture Lab tab */}
      {tab === 'lab' && <ArchitectureLab />}

      {/* Notes tab */}
      {tab === 'notes' && <NotesTab />}

      {/* Learning Log tab */}
      {tab === 'learning-log' && <LearningLogTab />}

      {/* Reports tab */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-card-border bg-card-bg p-6">
            <h2 className="text-sm font-medium mb-1">How this works</h2>
            <p className="text-sm text-muted">
              Suggestions are logged automatically during every Claude Code session.
              A weekly report compiles them every Sunday at noon.
              Run <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-xs">/enablement-coach</code> anytime
              for a deeper manual review.
            </p>
          </div>

          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-warning mb-3">
                Pending suggestions ({pending.length})
              </h3>
              <div className="space-y-3">
                {pending.map((s, i) => (
                  <div
                    key={`${s.title}-${i}`}
                    className="rounded-xl border border-card-border bg-card-bg p-5 flex items-start gap-4"
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${statusIcons[s.status] || 'bg-warning'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyles[s.type] || 'bg-muted/10 text-muted'}`}>
                          {s.type}
                        </span>
                        <h4 className="text-sm font-medium">{s.title}</h4>
                        <span className="text-xs text-muted">{s.date}</span>
                      </div>
                      <p className="text-sm text-muted">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reports.map((report) => (
            <div key={report.week}>
              <h3 className="text-sm font-medium text-muted mb-3">{report.week}</h3>
              <div className="space-y-3">
                {report.suggestions.map((s, i) => (
                  <div
                    key={`${s.title}-${i}`}
                    className="rounded-xl border border-card-border bg-card-bg p-5 flex items-start gap-4"
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${statusIcons[s.status] || 'bg-warning'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyles[s.type] || 'bg-muted/10 text-muted'}`}>
                          {s.type}
                        </span>
                        <h4 className="text-sm font-medium">{s.title}</h4>
                        <span className="text-xs text-muted">{s.date}</span>
                      </div>
                      <p className="text-sm text-muted">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {reports.length === 0 && pending.length === 0 && (
            <div className="rounded-xl border border-dashed border-card-border p-8 text-center">
              <p className="text-sm text-muted">No suggestions yet. They&apos;ll appear here as you use Claude Code.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
