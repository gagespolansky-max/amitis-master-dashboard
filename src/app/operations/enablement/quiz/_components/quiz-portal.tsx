'use client'

import { useState, useEffect, useCallback } from 'react'
import { aiSystemsQuestions, claudeCodeQuestions, type QuizQuestion } from '../_lib/quiz-data'

type QuizType = 'ai-systems' | 'claude-code'
type Screen = 'home' | 'quiz' | 'results'

interface TopicStats {
  correct: number
  total: number
  explanationScores: number[]
  lastAttempt: string
}

interface LearnerProfile {
  topics: Record<string, TopicStats>
  updatedAt: string
}

interface QuizHistoryEntry {
  date: string
  quizType: QuizType
  score: number
  total: number
  avgExplanationScore: number
  questions: {
    topic: string
    correct: boolean
    explanationScore: number
  }[]
}

interface StudyGuide {
  mastered: { topic: string; note: string }[]
  focusAreas: { topic: string; gap: string; exercise: string; keyConcept: string }[]
  patterns: string[]
  weeklyChallenge: { title: string; description: string; estimatedTime: string }
}

interface Reading {
  title: string
  author: string
  source: string
  type: 'foundational' | 'hands-on' | 'strategic'
  topic: string
  why: string
  keyTakeaway: string
  estimatedMinutes: number
}

interface GradeResult {
  score: number
  feedback: string
  topic: string
}

interface QuestionResult {
  question: QuizQuestion
  selectedIndex: number
  correct: boolean
  explanation: string
  gradeResult: GradeResult | null
}

function getProfile(): LearnerProfile {
  if (typeof window === 'undefined') return { topics: {}, updatedAt: '' }
  const stored = localStorage.getItem('learner-profile')
  return stored ? JSON.parse(stored) : { topics: {}, updatedAt: '' }
}

function saveProfile(profile: LearnerProfile) {
  profile.updatedAt = new Date().toISOString()
  localStorage.setItem('learner-profile', JSON.stringify(profile))
}

function getHistory(): QuizHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem('quiz-history')
  return stored ? JSON.parse(stored) : []
}

function saveHistory(history: QuizHistoryEntry[]) {
  localStorage.setItem('quiz-history', JSON.stringify(history))
}

function getWeakTopics(profile: LearnerProfile): string[] {
  return Object.entries(profile.topics)
    .filter(([, stats]) => {
      const accuracy = stats.total > 0 ? stats.correct / stats.total : 0
      const avgScore =
        stats.explanationScores.length > 0
          ? stats.explanationScores.reduce((a, b) => a + b, 0) / stats.explanationScores.length
          : 0
      return accuracy < 0.5 || avgScore < 3
    })
    .map(([topic]) => topic)
}

function getStaleTopics(profile: LearnerProfile): string[] {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  return Object.entries(profile.topics)
    .filter(([, stats]) => {
      const accuracy = stats.total > 0 ? stats.correct / stats.total : 0
      return accuracy >= 0.5 && stats.lastAttempt < sevenDaysAgo
    })
    .map(([topic]) => topic)
}

function TopicStrength({ stats }: { stats: TopicStats }) {
  const accuracy = stats.total > 0 ? stats.correct / stats.total : 0
  const avgScore =
    stats.explanationScores.length > 0
      ? stats.explanationScores.reduce((a, b) => a + b, 0) / stats.explanationScores.length
      : 0

  let level: string, color: string, bgColor: string
  if (accuracy >= 0.7 && avgScore >= 3.5) {
    level = 'Strong'
    color = 'text-success'
    bgColor = 'bg-success'
  } else if (accuracy >= 0.4 && avgScore >= 2.5) {
    level = 'Developing'
    color = 'text-warning'
    bgColor = 'bg-warning'
  } else {
    level = 'Weak'
    color = 'text-red-400'
    bgColor = 'bg-red-400'
  }

  const pct = Math.round(accuracy * 100)

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-card-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bgColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${color} w-20 text-right`}>
        {level} ({pct}%)
      </span>
    </div>
  )
}

function KnowledgeGapDashboard({ profile }: { profile: LearnerProfile }) {
  const topics = Object.entries(profile.topics)
  const weakTopics = getWeakTopics(profile)
  const staleTopics = getStaleTopics(profile)

  if (topics.length === 0) return null

  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
      <h3 className="text-sm font-medium mb-4">Knowledge Map</h3>
      <div className="space-y-3">
        {topics.map(([topic, stats]) => (
          <div key={topic}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">{topic}</span>
              <span className="text-xs text-muted">
                {stats.correct}/{stats.total} correct
              </span>
            </div>
            <TopicStrength stats={stats} />
          </div>
        ))}
      </div>

      {weakTopics.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
          <p className="text-xs font-medium text-red-400 mb-1">Knowledge gaps</p>
          <p className="text-xs text-muted">{weakTopics.join(', ')}</p>
        </div>
      )}

      {staleTopics.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
          <p className="text-xs font-medium text-accent mb-1">Due for a refresher</p>
          <p className="text-xs text-muted">
            {staleTopics.join(', ')} — you scored well but haven&apos;t revisited in 7+ days
          </p>
        </div>
      )}
    </div>
  )
}

export default function QuizPortal() {
  const [screen, setScreen] = useState<Screen>('home')
  const [quizType, setQuizType] = useState<QuizType>('ai-systems')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [explanation, setExplanation] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [grading, setGrading] = useState(false)
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null)
  const [results, setResults] = useState<QuestionResult[]>([])
  const [profile, setProfile] = useState<LearnerProfile>({ topics: {}, updatedAt: '' })
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [tips, setTips] = useState<{ topic: string; tip: string }[]>([])
  const [loadingTips, setLoadingTips] = useState(false)
  const [history, setHistory] = useState<QuizHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null)
  const [loadingGuide, setLoadingGuide] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [readings, setReadings] = useState<Reading[]>([])
  const [loadingReadings, setLoadingReadings] = useState(false)
  const [showReadings, setShowReadings] = useState(false)

  useEffect(() => {
    setProfile(getProfile())
    setHistory(getHistory())
  }, [])

  async function generateStudyGuide() {
    const hist = getHistory()
    if (hist.length < 3) return

    setLoadingGuide(true)
    setShowGuide(true)
    try {
      const resp = await fetch('/operations/enablement/quiz/api/study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: getProfile(),
          recentHistory: hist.slice(0, 5),
        }),
      })
      const data = await resp.json()
      if (!data.error) setStudyGuide(data)
    } catch {
      // Failed
    }
    setLoadingGuide(false)
  }

  async function fetchReadings() {
    const p = getProfile()
    const weak = getWeakTopics(p)
    if (weak.length === 0) return

    setLoadingReadings(true)
    setShowReadings(true)
    try {
      const resp = await fetch('/operations/enablement/quiz/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weakTopics: weak, profile: p }),
      })
      const data = await resp.json()
      if (data.readings?.length > 0) setReadings(data.readings)
    } catch {
      // Failed
    }
    setLoadingReadings(false)
  }

  const startQuiz = useCallback(
    async (type: QuizType) => {
      setQuizType(type)
      setCurrentIndex(0)
      setResults([])
      setSelectedOption(null)
      setExplanation('')
      setSubmitted(false)
      setGradeResult(null)
      setTips([])

      const baseQuestions = type === 'ai-systems' ? [...aiSystemsQuestions] : [...claudeCodeQuestions]
      const weakTopics = getWeakTopics(profile)

      // Always try to generate fresh questions via API
      setLoadingQuestions(true)
      try {
        const allTopics = [...new Set(baseQuestions.map((q) => q.topic))]
        // Prioritize weak topics but include all topics for variety
        const topicsToGenerate = [
          ...weakTopics.filter((t) => allTopics.includes(t)),
          ...allTopics.filter((t) => !weakTopics.includes(t)),
        ]

        const resp = await fetch('/operations/enablement/quiz/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizType: type,
            weakTopics: topicsToGenerate,
            count: 8,
          }),
        })
        const data = await resp.json()
        if (data.questions?.length >= 6) {
          const generated = data.questions.slice(0, 8).map((q: QuizQuestion) => ({
            ...q,
            id: q.id || `gen-${Math.random().toString(36).slice(2, 6)}`,
          }))
          setQuestions(generated)
          setLoadingQuestions(false)
          setScreen('quiz')
          return
        }
      } catch {
        // Fall through to base questions
      }
      setLoadingQuestions(false)

      // Fallback: shuffle base questions so at least the order varies
      for (let i = baseQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [baseQuestions[i], baseQuestions[j]] = [baseQuestions[j], baseQuestions[i]]
      }
      setQuestions(baseQuestions.slice(0, 8))
      setScreen('quiz')
    },
    [profile]
  )

  async function submitAnswer() {
    if (selectedOption === null || !explanation.trim()) return

    setGrading(true)
    const q = questions[currentIndex]
    const correct = selectedOption === q.correctIndex

    let grade: GradeResult = { score: 3, feedback: 'Grading unavailable', topic: q.topic }

    try {
      const resp = await fetch('/operations/enablement/quiz/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          userAnswer: q.options[selectedOption],
          correctAnswer: q.options[q.correctIndex],
          userExplanation: explanation,
          referenceExplanation: q.explanation,
          topic: q.topic,
        }),
      })
      grade = await resp.json()
    } catch {
      // Use default grade
    }

    setGradeResult(grade)
    setGrading(false)
    setSubmitted(true)

    const result: QuestionResult = {
      question: q,
      selectedIndex: selectedOption,
      correct,
      explanation,
      gradeResult: grade,
    }
    setResults((prev) => [...prev, result])

    // Update profile
    const updatedProfile = { ...profile }
    if (!updatedProfile.topics[q.topic]) {
      updatedProfile.topics[q.topic] = {
        correct: 0,
        total: 0,
        explanationScores: [],
        lastAttempt: '',
      }
    }
    const topicStats = updatedProfile.topics[q.topic]
    topicStats.total += 1
    if (correct) topicStats.correct += 1
    topicStats.explanationScores.push(grade.score)
    topicStats.lastAttempt = new Date().toISOString()

    setProfile(updatedProfile)
    saveProfile(updatedProfile)
  }

  async function finishQuiz() {
    const totalCorrect = results.filter((r) => r.correct).length
    const avgExplanation =
      results.reduce((sum, r) => sum + (r.gradeResult?.score || 0), 0) / results.length

    const entry: QuizHistoryEntry = {
      date: new Date().toISOString(),
      quizType,
      score: totalCorrect,
      total: results.length,
      avgExplanationScore: Math.round(avgExplanation * 10) / 10,
      questions: results.map((r) => ({
        topic: r.question.topic,
        correct: r.correct,
        explanationScore: r.gradeResult?.score || 0,
      })),
    }

    const hist = getHistory()
    hist.unshift(entry)
    saveHistory(hist)
    setHistory(hist)

    // Get study tips for weak topics this session
    const weakThisSession = results
      .filter((r) => !r.correct || (r.gradeResult?.score || 0) < 3)
      .map((r) => r.question.topic)
    const uniqueWeak = [...new Set(weakThisSession)].slice(0, 3)

    if (uniqueWeak.length > 0) {
      setLoadingTips(true)
      try {
        const resp = await fetch('/operations/enablement/quiz/api/tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weakTopics: uniqueWeak }),
        })
        const data = await resp.json()
        setTips(data.tips || [])
      } catch {
        // No tips
      }
      setLoadingTips(false)
    }

    setScreen('results')
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
      setSelectedOption(null)
      setExplanation('')
      setSubmitted(false)
      setGradeResult(null)
    } else {
      finishQuiz()
    }
  }

  const difficultyStyles = {
    easy: 'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    hard: 'bg-red-400/10 text-red-400',
  }

  // HOME SCREEN
  if (screen === 'home') {
    return (
      <div>
        <KnowledgeGapDashboard profile={profile} />

        {/* Study Guide — shows after 3+ quizzes */}
        {history.length >= 3 && (
          <div className="mb-6">
            <button
              onClick={() => showGuide ? setShowGuide(false) : generateStudyGuide()}
              disabled={loadingGuide}
              className="w-full rounded-xl border border-accent/20 bg-accent/5 p-4 text-left transition-all hover:border-accent/40 flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-medium text-accent">Weekly Study Guide</h3>
                <p className="text-xs text-muted mt-0.5">
                  Personalized based on your last {Math.min(history.length, 5)} quizzes. Click to {showGuide ? 'hide' : 'generate'}.
                </p>
              </div>
              {loadingGuide ? (
                <svg className="animate-spin h-4 w-4 text-accent" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg
                  className={`w-4 h-4 text-accent transition-transform ${showGuide ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {showGuide && studyGuide && (
              <div className="mt-3 space-y-4">
                {/* Mastered */}
                {studyGuide.mastered.length > 0 && (
                  <div className="rounded-xl border border-success/20 bg-success/5 p-5">
                    <h4 className="text-xs font-medium text-success mb-3">What you&apos;ve mastered</h4>
                    <div className="space-y-2">
                      {studyGuide.mastered.map((m) => (
                        <div key={m.topic} className="flex items-start gap-2">
                          <span className="mt-1 w-2 h-2 rounded-full bg-success shrink-0" />
                          <div>
                            <span className="text-sm font-medium">{m.topic}</span>
                            <p className="text-xs text-muted">{m.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Focus areas */}
                {studyGuide.focusAreas.length > 0 && (
                  <div className="rounded-xl border border-warning/20 bg-warning/5 p-5">
                    <h4 className="text-xs font-medium text-warning mb-3">Focus on this week</h4>
                    <div className="space-y-4">
                      {studyGuide.focusAreas.map((f) => (
                        <div key={f.topic}>
                          <p className="text-sm font-medium">{f.topic}</p>
                          <p className="text-xs text-red-400 mt-1">{f.gap}</p>
                          <div className="mt-2 p-3 rounded-lg bg-background border border-card-border">
                            <p className="text-[10px] font-medium text-accent uppercase tracking-wider mb-1">Exercise</p>
                            <p className="text-xs text-muted">{f.exercise}</p>
                          </div>
                          <div className="mt-2 p-3 rounded-lg bg-background border border-card-border">
                            <p className="text-[10px] font-medium text-accent uppercase tracking-wider mb-1">Key concept</p>
                            <p className="text-xs text-muted">{f.keyConcept}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Patterns */}
                {studyGuide.patterns.length > 0 && (
                  <div className="rounded-xl border border-card-border bg-card-bg p-5">
                    <h4 className="text-xs font-medium text-muted mb-3">Patterns noticed</h4>
                    <ul className="space-y-2">
                      {studyGuide.patterns.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weekly challenge */}
                {studyGuide.weeklyChallenge && (
                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
                    <h4 className="text-xs font-medium text-accent mb-2">This week&apos;s challenge</h4>
                    <p className="text-sm font-medium">{studyGuide.weeklyChallenge.title}</p>
                    <p className="text-xs text-muted mt-1">{studyGuide.weeklyChallenge.description}</p>
                    <p className="text-[10px] text-accent mt-2">{studyGuide.weeklyChallenge.estimatedTime}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => startQuiz('ai-systems')}
            disabled={loadingQuestions}
            className="group rounded-xl border border-card-border bg-card-bg p-6 text-left transition-all hover:border-accent/30 hover:bg-accent/5"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🧠</span>
              <h3 className="text-sm font-medium group-hover:text-accent transition-colors">
                AI Systems & Orchestration
              </h3>
            </div>
            <p className="text-xs text-muted">
              LLM fundamentals, prompt engineering, RAG, agentic patterns, cost tradeoffs, and tech
              stack.
            </p>
            <p className="text-xs text-accent mt-3">8 questions &middot; ~15 min</p>
          </button>

          <button
            onClick={() => startQuiz('claude-code')}
            disabled={loadingQuestions}
            className="group rounded-xl border border-card-border bg-card-bg p-6 text-left transition-all hover:border-accent/30 hover:bg-accent/5"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⌨️</span>
              <h3 className="text-sm font-medium group-hover:text-accent transition-colors">
                Claude Code Competency
              </h3>
            </div>
            <p className="text-xs text-muted">
              Core usage, workflows, CLAUDE.md, MCP, permissions, advanced techniques, and
              troubleshooting.
            </p>
            <p className="text-xs text-accent mt-3">8 questions &middot; ~15 min</p>
          </button>
        </div>

        {loadingQuestions && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating adaptive questions for your weak areas...
            </div>
          </div>
        )}

        {/* Useful Readings */}
        {getWeakTopics(profile).length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => showReadings ? setShowReadings(false) : fetchReadings()}
              disabled={loadingReadings}
              className="w-full rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-left transition-all hover:border-purple-500/40 flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-medium text-purple-400">Useful Readings</h3>
                <p className="text-xs text-muted mt-0.5">
                  Curated articles and papers for your weak areas. Click to {showReadings ? 'hide' : 'generate'}.
                </p>
              </div>
              {loadingReadings ? (
                <svg className="animate-spin h-4 w-4 text-purple-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg
                  className={`w-4 h-4 text-purple-400 transition-transform ${showReadings ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {showReadings && readings.length > 0 && (
              <div className="mt-3 space-y-3">
                {readings.map((r, i) => {
                  const typeStyle = {
                    foundational: 'bg-blue-500/10 text-blue-400',
                    'hands-on': 'bg-success/10 text-success',
                    strategic: 'bg-purple-500/10 text-purple-400',
                  }[r.type] || 'bg-muted/10 text-muted'

                  return (
                    <div
                      key={`${r.title}-${i}`}
                      className="rounded-xl border border-card-border bg-card-bg p-5"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeStyle}`}>
                          {r.type}
                        </span>
                        <span className="text-[10px] text-muted px-2 py-0.5 rounded-full bg-card-border">
                          {r.topic}
                        </span>
                        <span className="text-[10px] text-muted ml-auto">
                          ~{r.estimatedMinutes} min read
                        </span>
                      </div>

                      <h4 className="text-sm font-medium mb-1">{r.title}</h4>
                      <p className="text-xs text-muted mb-2">
                        {r.author} &middot; {r.source}
                      </p>

                      <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 mb-2">
                        <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1">
                          Why this matters for you
                        </p>
                        <p className="text-xs text-muted">{r.why}</p>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        <p className="text-xs text-muted">
                          <span className="text-foreground font-medium">Key takeaway:</span> {r.keyTakeaway}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Quiz History */}
        {history.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full mb-3"
            >
              <h3 className="text-sm font-medium">Quiz History ({history.length})</h3>
              <svg
                className={`w-4 h-4 text-muted transition-transform ${showHistory ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showHistory && (
              <div className="space-y-2">
                {history.map((entry, i) => {
                  const date = new Date(entry.date)
                  const label =
                    entry.quizType === 'ai-systems'
                      ? 'AI Systems & Orchestration'
                      : 'Claude Code Competency'
                  const pct = Math.round((entry.score / entry.total) * 100)

                  return (
                    <div
                      key={`${entry.date}-${i}`}
                      className="rounded-xl border border-card-border bg-card-bg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{label}</span>
                          <span className="text-[10px] text-muted">
                            {date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}{' '}
                            {date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-mono ${
                              pct >= 70
                                ? 'text-success'
                                : pct >= 50
                                  ? 'text-warning'
                                  : 'text-red-400'
                            }`}
                          >
                            {entry.score}/{entry.total} ({pct}%)
                          </span>
                          <span className="text-xs font-mono text-accent">
                            Exp: {entry.avgExplanationScore}/5
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        {entry.questions.map((q, qi) => (
                          <div
                            key={qi}
                            className="group relative flex-1"
                          >
                            <div
                              className={`h-2 rounded-full ${
                                q.correct ? 'bg-success' : 'bg-red-400'
                              }`}
                            />
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                              <div className="bg-card-bg border border-card-border rounded-md px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                                <p className="font-medium">{q.topic}</p>
                                <p className="text-muted">
                                  {q.correct ? 'Correct' : 'Wrong'} &middot; Explanation: {q.explanationScore}/5
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.questions
                          .filter((q) => !q.correct || q.explanationScore < 3)
                          .map((q, qi) => (
                            <span
                              key={qi}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400"
                            >
                              {q.topic}
                            </span>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // QUIZ SCREEN
  if (screen === 'quiz') {
    const q = questions[currentIndex]
    const progress = ((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setScreen('home')}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            ← Back to quizzes
          </button>
          <span className="text-xs text-muted">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-card-border rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="rounded-xl border border-card-border bg-card-bg p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${difficultyStyles[q.difficulty]}`}>
              {q.difficulty}
            </span>
            <span className="text-[10px] text-muted px-2 py-0.5 rounded-full bg-card-border">
              {q.topic}
            </span>
          </div>

          <p className="text-sm font-medium leading-relaxed mb-6">{q.question}</p>

          {/* Options */}
          <div className="space-y-2 mb-6">
            {q.options.map((option, i) => {
              let optionStyle = 'border-card-border hover:border-accent/30'
              if (submitted) {
                if (i === q.correctIndex) optionStyle = 'border-success/50 bg-success/5'
                else if (i === selectedOption && !results[results.length - 1]?.correct)
                  optionStyle = 'border-red-400/50 bg-red-400/5'
                else optionStyle = 'border-card-border opacity-50'
              } else if (i === selectedOption) {
                optionStyle = 'border-accent bg-accent/5'
              }

              return (
                <button
                  key={i}
                  onClick={() => !submitted && setSelectedOption(i)}
                  disabled={submitted}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${optionStyle}`}
                >
                  <span className="text-muted mr-2 font-mono text-xs">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {option}
                </button>
              )
            })}
          </div>

          {/* Explanation input */}
          {!submitted && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted mb-2">
                Explain your reasoning *
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Why did you choose this answer? What's the reasoning..."
                className="w-full px-4 py-3 rounded-lg border border-card-border bg-background text-sm resize-none focus:outline-none focus:border-accent transition-colors"
                rows={3}
              />
            </div>
          )}

          {/* Submit / Next buttons */}
          {!submitted ? (
            <button
              onClick={submitAnswer}
              disabled={selectedOption === null || !explanation.trim() || grading}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {grading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Grading...
                </>
              ) : (
                'Submit Answer'
              )}
            </button>
          ) : (
            <div className="space-y-4">
              {/* Reference explanation */}
              <div className="p-4 rounded-lg bg-success/5 border border-success/10">
                <p className="text-xs font-medium text-success mb-1">Correct reasoning</p>
                <p className="text-sm text-muted">{q.explanation}</p>
              </div>

              {/* AI grade */}
              {gradeResult && (
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/10">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-medium text-accent">Your explanation</p>
                    <span className="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">
                      {gradeResult.score}/5
                    </span>
                  </div>
                  <p className="text-sm text-muted">{gradeResult.feedback}</p>
                </div>
              )}

              <button
                onClick={nextQuestion}
                className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium transition-colors hover:bg-accent-hover"
              >
                {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // RESULTS SCREEN
  const totalCorrect = results.filter((r) => r.correct).length
  const avgExplanation =
    results.reduce((sum, r) => sum + (r.gradeResult?.score || 0), 0) / results.length

  return (
    <div>
      <button
        onClick={() => {
          setScreen('home')
          setProfile(getProfile())
        }}
        className="text-xs text-muted hover:text-foreground transition-colors mb-4"
      >
        ← Back to quizzes
      </button>

      <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">
          {quizType === 'ai-systems' ? 'AI Systems & Orchestration' : 'Claude Code Competency'} — Results
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-card-border/30 text-center">
            <p className="text-2xl font-semibold">
              {totalCorrect}/{results.length}
            </p>
            <p className="text-xs text-muted mt-1">Correct answers</p>
          </div>
          <div className="p-4 rounded-lg bg-card-border/30 text-center">
            <p className="text-2xl font-semibold">{Math.round(avgExplanation * 10) / 10}/5</p>
            <p className="text-xs text-muted mt-1">Avg explanation score</p>
          </div>
        </div>

        {/* Study tips */}
        {loadingTips && (
          <div className="p-4 rounded-lg bg-accent/5 border border-accent/10 mb-6 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-accent" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-muted">Generating study tips...</p>
          </div>
        )}

        {tips.length > 0 && (
          <div className="p-4 rounded-lg bg-accent/5 border border-accent/10 mb-6">
            <p className="text-xs font-medium text-accent mb-3">What you should review</p>
            <div className="space-y-3">
              {tips.map((tip) => (
                <div key={tip.topic}>
                  <p className="text-sm font-medium">{tip.topic}</p>
                  <p className="text-xs text-muted mt-0.5">{tip.tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question breakdown */}
        <h4 className="text-sm font-medium mb-3">Question breakdown</h4>
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${
                r.correct ? 'border-success/20 bg-success/5' : 'border-red-400/20 bg-red-400/5'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${r.correct ? 'bg-success' : 'bg-red-400'}`} />
                  <span className="text-xs text-muted">{r.question.topic}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${difficultyStyles[r.question.difficulty]}`}>
                    {r.question.difficulty}
                  </span>
                </div>
                <span className="text-xs font-mono text-muted">
                  Explanation: {r.gradeResult?.score || '-'}/5
                </span>
              </div>
              <p className="text-xs text-muted truncate">{r.question.question}</p>
              {r.gradeResult?.feedback && (
                <p className="text-xs text-muted/70 mt-1 italic">{r.gradeResult.feedback}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => startQuiz(quizType)}
          className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium transition-colors hover:bg-accent-hover"
        >
          Retake Quiz
        </button>
        <button
          onClick={() => startQuiz(quizType === 'ai-systems' ? 'claude-code' : 'ai-systems')}
          className="flex-1 py-2.5 rounded-lg border border-card-border text-sm font-medium transition-colors hover:bg-white/5"
        >
          Try {quizType === 'ai-systems' ? 'Claude Code' : 'AI Systems'} Quiz
        </button>
      </div>
    </div>
  )
}
