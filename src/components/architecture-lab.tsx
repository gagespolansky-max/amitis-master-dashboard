'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  ChallengeSize, Challenge, FlashChallenge, AgentDesign,
  DesignSubmission, DesignGrade, StressTestScenario, StressTestGrade,
  LabHistoryEntry, LabStreak, ScenarioHistory,
} from '@/lib/lab-types'
import WorkflowBuilder from './workflow-builder'

// ── Storage helpers ──────────────────────────────────────────────

function loadStreak(): LabStreak {
  if (typeof window === 'undefined') return { dates: [] }
  const s = localStorage.getItem('lab-streak')
  return s ? JSON.parse(s) : { dates: [] }
}

function saveStreak(streak: LabStreak) {
  localStorage.setItem('lab-streak', JSON.stringify(streak))
}

function recordSession(sessionType: string) {
  const streak = loadStreak()
  streak.dates.push({ date: new Date().toISOString().slice(0, 10), sessionType })
  saveStreak(streak)
  return streak
}

function loadHistory(): LabHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const s = localStorage.getItem('lab-history')
  return s ? JSON.parse(s) : []
}

function saveHistory(history: LabHistoryEntry[]) {
  localStorage.setItem('lab-history', JSON.stringify(history))
}

function loadScenarioHistory(): ScenarioHistory[] {
  if (typeof window === 'undefined') return []
  const s = localStorage.getItem('lab-scenario-history')
  return s ? JSON.parse(s) : []
}

function saveScenarioHistory(history: ScenarioHistory[]) {
  localStorage.setItem('lab-scenario-history', JSON.stringify(history))
}

function getWeakTopicsFromProfile(): string[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem('learner-profile')
  if (!stored) return []
  const profile = JSON.parse(stored)
  return Object.entries(profile.topics || {})
    .filter(([, stats]: [string, unknown]) => {
      const s = stats as { correct: number; total: number; explanationScores: number[] }
      const accuracy = s.total > 0 ? s.correct / s.total : 0
      const avgScore = s.explanationScores?.length > 0
        ? s.explanationScores.reduce((a: number, b: number) => a + b, 0) / s.explanationScores.length
        : 0
      return accuracy < 0.5 || avgScore < 3
    })
    .map(([topic]) => topic)
}

function getCurrentStreakDays(streak: LabStreak): number {
  const dates = [...new Set(streak.dates.map(d => d.date))].sort().reverse()
  if (dates.length === 0) return 0
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (dates[0] !== today && dates[0] !== yesterday) return 0
  let count = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (prev.getTime() - curr.getTime()) / 86400000
    if (diff <= 1.5) count++
    else break
  }
  return count
}

function getWeekDots(streak: LabStreak) {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))

  const dots = []
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const todayStr = today.toISOString().slice(0, 10)
    const isFuture = dateStr > todayStr
    const completed = streak.dates.some(s => s.date === dateStr)
    dots.push({ label: labels[i], completed, isFuture, date: dateStr })
  }
  return dots
}

// ── Size card data ───────────────────────────────────────────────

const SIZE_INFO: Record<ChallengeSize, { title: string; time: string; desc: string; phases: string }> = {
  flash: {
    title: 'Flash Review',
    time: '~5 min',
    desc: 'Review a completed architecture and answer 3 rapid-fire questions.',
    phases: 'Diagram review + 3 questions',
  },
  quick: {
    title: 'Quick Build',
    time: '~10 min',
    desc: 'Build a small architecture (2-3 agents). Design only, no stress test.',
    phases: 'Design → Grade',
  },
  standard: {
    title: 'Standard Build',
    time: '~20 min',
    desc: 'Realistic scenario with 3-5 agents. Design + stress test.',
    phases: 'Design → Stress Test → Grade',
  },
  deep: {
    title: 'Deep Build',
    time: '~45 min',
    desc: 'Complex multi-constraint scenario. All three phases.',
    phases: 'Design → Stress Test → Optimize',
  },
}

// ── Main Component ───────────────────────────────────────────────

type View = 'home' | 'flash' | 'challenge' | 'workflows'
type Phase = 'design' | 'stress-test' | 'optimize' | 'summary'

export default function ArchitectureLab() {
  const [view, setView] = useState<View>('home')
  const [streak, setStreak] = useState<LabStreak>({ dates: [] })
  const [history, setHistory] = useState<LabHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Challenge state
  const [challengeSize, setChallengeSize] = useState<ChallengeSize>('standard')
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<Phase>('design')
  const [sessionStart, setSessionStart] = useState<number>(0)
  const [elapsed, setElapsed] = useState(0)

  // Design form
  const [agents, setAgents] = useState<AgentDesign[]>([])
  const [delegationProtocol, setDelegationProtocol] = useState('')
  const [humanCheckpoints, setHumanCheckpoints] = useState('')
  const [memoryStrategy, setMemoryStrategy] = useState('')
  const [designGrade, setDesignGrade] = useState<DesignGrade | null>(null)
  const [grading, setGrading] = useState(false)
  const [userDiagramSvg, setUserDiagramSvg] = useState('')
  const [refDiagramSvg, setRefDiagramSvg] = useState('')

  // Stress test
  const [stressScenarios, setStressScenarios] = useState<StressTestScenario[]>([])
  const [stressResponses, setStressResponses] = useState<{ whatBreaks: string; rootCause: string; fix: string }[]>([])
  const [stressGrades, setStressGrades] = useState<StressTestGrade[]>([])
  const [loadingStress, setLoadingStress] = useState(false)

  // Flash review
  const [flashChallenge, setFlashChallenge] = useState<FlashChallenge | null>(null)
  const [flashAnswers, setFlashAnswers] = useState<(number | null)[]>([null, null, null])
  const [flashSubmitted, setFlashSubmitted] = useState(false)
  const [flashExplanations, setFlashExplanations] = useState<string[]>(['', '', ''])

  useEffect(() => {
    setStreak(loadStreak())
    setHistory(loadHistory())
  }, [])

  // Timer
  useEffect(() => {
    if (sessionStart === 0) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStart])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // ── Start challenge ──────────────────────────────────────────

  const startChallenge = useCallback(async (size: ChallengeSize) => {
    setChallengeSize(size)
    setLoading(true)
    setPhase('design')
    setDesignGrade(null)
    setStressScenarios([])
    setStressGrades([])
    setUserDiagramSvg('')
    setRefDiagramSvg('')
    setAgents([{
      id: '1', name: 'Orchestrator', modelTier: 'sonnet',
      tools: [], responsibilities: '', reportsTo: 'top-level',
    }])
    setDelegationProtocol('')
    setHumanCheckpoints('')
    setMemoryStrategy('')

    if (size === 'flash') {
      try {
        const resp = await fetch('/api/lab/flash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioHistory: loadScenarioHistory() }),
        })
        const data = await resp.json()
        if (data.error) throw new Error(data.error)
        setFlashChallenge(data)
        setFlashAnswers(Array(data.questions?.length || 3).fill(null))
        setFlashExplanations(Array(data.questions?.length || 3).fill(''))
        setFlashSubmitted(false)
        setView('flash')
      } catch {
        // Failed
      }
      setLoading(false)
      setSessionStart(Date.now())
      return
    }

    try {
      const resp = await fetch('/api/lab/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size,
          weakTopics: getWeakTopicsFromProfile(),
          scenarioHistory: loadScenarioHistory(),
        }),
      })
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      setChallenge(data)
      setView('challenge')
    } catch {
      // Failed
    }
    setLoading(false)
    setSessionStart(Date.now())
  }, [])

  // ── Submit design ────────────────────────────────────────────

  async function submitDesign() {
    if (!challenge) return
    setGrading(true)

    const submission: DesignSubmission = {
      agents, delegationProtocol, humanCheckpoints, memoryStrategy,
    }

    // Grade + generate diagrams in parallel
    const [gradeResp, userDiagResp, refDiagResp] = await Promise.all([
      fetch('/api/lab/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission, challenge, size: challengeSize }),
      }),
      fetch('/api/lab/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: submission.agents,
          delegationProtocol: submission.delegationProtocol,
          title: 'Your Design',
          humanCheckpoints: submission.humanCheckpoints,
          memoryStrategy: submission.memoryStrategy,
        }),
      }),
      fetch('/api/lab/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: challenge.referenceSolution.agents.map((a, i) => ({
            id: String(i + 1),
            name: a.name,
            modelTier: a.modelTier,
            tools: a.tools,
            responsibilities: a.role,
            reportsTo: i === 0 ? 'top-level' : '1',
          })),
          delegationProtocol: challenge.referenceSolution.delegationProtocol,
          title: 'Reference Solution',
          humanCheckpoints: challenge.referenceSolution.humanCheckpoints,
          memoryStrategy: challenge.referenceSolution.memoryStrategy,
        }),
      }),
    ])

    const [grade, userDiag, refDiag] = await Promise.all([
      gradeResp.json(),
      userDiagResp.json(),
      refDiagResp.json(),
    ])

    setDesignGrade(grade)
    setUserDiagramSvg(userDiag.svg || '')
    setRefDiagramSvg(refDiag.svg || '')
    setGrading(false)

    // If quick build, we're done — go to summary
    if (challengeSize === 'quick') {
      finishChallenge(grade.overall)
    }
  }

  // ── Start stress test ────────────────────────────────────────

  async function startStressTest() {
    if (!challenge) return
    setPhase('stress-test')
    setLoadingStress(true)

    try {
      const resp = await fetch('/api/lab/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          submission: { agents, delegationProtocol, humanCheckpoints, memoryStrategy },
          challenge,
          weakTopics: getWeakTopicsFromProfile(),
        }),
      })
      const data = await resp.json()
      setStressScenarios(data.scenarios || [])
      setStressResponses((data.scenarios || []).map(() => ({ whatBreaks: '', rootCause: '', fix: '' })))
    } catch {
      // Failed
    }
    setLoadingStress(false)
  }

  async function submitStressTest() {
    setGrading(true)
    try {
      const resp = await fetch('/api/lab/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grade',
          scenarios: stressScenarios,
          responses: stressResponses,
        }),
      })
      const data = await resp.json()
      setStressGrades(data.grades || [])
    } catch {
      // Failed
    }
    setGrading(false)

    if (challengeSize === 'standard') {
      const stAvg = stressGrades.length > 0
        ? stressGrades.reduce((s, g) => s + (g.diagnosticAccuracy + g.fixQuality) / 2, 0) / stressGrades.length
        : 0
      finishChallenge(((designGrade?.overall || 0) + stAvg) / 2)
    }
  }

  // ── Finish challenge ─────────────────────────────────────────

  function finishChallenge(overallScore: number) {
    if (!challenge) return
    setPhase('summary')

    const entry: LabHistoryEntry = {
      challengeId: challenge.id,
      size: challengeSize,
      scenarioTitle: challenge.scenario.slice(0, 80),
      date: new Date().toISOString(),
      designScore: designGrade?.overall || 0,
      stressTestScore: stressGrades.length > 0
        ? stressGrades.reduce((s, g) => s + (g.diagnosticAccuracy + g.fixQuality) / 2, 0) / stressGrades.length
        : undefined,
      overallScore: Math.round(overallScore * 10) / 10,
      keyLesson: designGrade?.feedback?.split('.')[0] || '',
      industry: challenge.scenario.split('.')[0].slice(0, 40),
      topics: ['orchestration patterns', 'tool routing', 'cost optimization'],
    }

    const hist = loadHistory()
    hist.unshift(entry)
    saveHistory(hist)
    setHistory(hist)

    const scenHist = loadScenarioHistory()
    scenHist.push({
      industry: entry.industry,
      businessFunction: entry.scenarioTitle,
      primaryTools: challenge.availableTools.slice(0, 3),
      architecturePattern: 'orchestrator-worker',
      date: new Date().toISOString(),
    })
    saveScenarioHistory(scenHist)

    const s = recordSession(challengeSize)
    setStreak(s)

    // Update learner profile
    updateLearnerProfile(designGrade)
  }

  function updateLearnerProfile(grade: DesignGrade | null) {
    if (!grade) return
    const stored = localStorage.getItem('learner-profile')
    const profile = stored ? JSON.parse(stored) : { topics: {}, updatedAt: '' }

    const topicScores: Record<string, number> = {
      'Orchestration Patterns': grade.architecturePattern,
      'Tool Routing': grade.toolRouting,
      'Cost Optimization': grade.modelTierSelection,
      'Delegation Design': grade.delegationClarity,
    }
    if (grade.humanInTheLoop > 0) topicScores['Human-in-the-Loop'] = grade.humanInTheLoop
    if (grade.memoryStrategy > 0) topicScores['Memory Management'] = grade.memoryStrategy

    for (const [topic, score] of Object.entries(topicScores)) {
      if (!profile.topics[topic]) {
        profile.topics[topic] = { correct: 0, total: 0, explanationScores: [], lastAttempt: '' }
      }
      profile.topics[topic].total += 1
      if (score >= 4) profile.topics[topic].correct += 1
      profile.topics[topic].explanationScores.push(score)
      profile.topics[topic].lastAttempt = new Date().toISOString()
    }

    profile.updatedAt = new Date().toISOString()
    localStorage.setItem('learner-profile', JSON.stringify(profile))
  }

  // ── Agent form helpers ───────────────────────────────────────

  function addAgent() {
    setAgents(prev => [...prev, {
      id: Date.now().toString(),
      name: '',
      modelTier: 'sonnet',
      tools: [],
      responsibilities: '',
      reportsTo: agents[0]?.id || 'top-level',
    }])
  }

  function updateAgent(id: string, field: string, value: string | string[]) {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  function removeAgent(id: string) {
    if (agents.length <= 1) return
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  function toggleTool(agentId: string, tool: string) {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a
      const tools = a.tools.includes(tool)
        ? a.tools.filter(t => t !== tool)
        : [...a.tools, tool]
      return { ...a, tools }
    }))
  }

  // ── Flash review submit ──────────────────────────────────────

  function submitFlash() {
    setFlashSubmitted(true)
    recordSession('flash')
    setStreak(loadStreak())

    // Update learner profile
    const stored = localStorage.getItem('learner-profile')
    const profile = stored ? JSON.parse(stored) : { topics: {}, updatedAt: '' }
    const topic = 'Architecture Review'
    if (!profile.topics[topic]) {
      profile.topics[topic] = { correct: 0, total: 0, explanationScores: [], lastAttempt: '' }
    }
    const correct = flashChallenge?.questions.filter((q, i) => flashAnswers[i] === q.correctIndex).length || 0
    profile.topics[topic].correct += correct
    profile.topics[topic].total += flashChallenge?.questions.length || 3
    profile.topics[topic].explanationScores.push(Math.round((correct / (flashChallenge?.questions.length || 3)) * 5))
    profile.topics[topic].lastAttempt = new Date().toISOString()
    profile.updatedAt = new Date().toISOString()
    localStorage.setItem('learner-profile', JSON.stringify(profile))
  }

  // ── Design validation ────────────────────────────────────────

  const isDesignValid = agents.length >= 2
    && agents.every(a => a.name.trim() && a.tools.length > 0)
    && delegationProtocol.trim().length > 10
    && (challengeSize === 'quick' || humanCheckpoints.trim().length > 0)

  // ── RENDER: Home ─────────────────────────────────────────────

  if (view === 'home') {
    const streakDays = getCurrentStreakDays(streak)
    const weekDots = getWeekDots(streak)
    const sizeCounts = { flash: 0, quick: 0, standard: 0, deep: 0 }
    history.forEach(h => { if (sizeCounts[h.size] !== undefined) sizeCounts[h.size]++ })

    return (
      <div>
        {/* Streak + Week */}
        <div className="rounded-xl border border-card-border bg-card-bg p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-2xl font-semibold">{streakDays}</span>
              <span className="text-sm text-muted ml-2">day streak</span>
            </div>
            {streakDays >= 7 && (
              <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                {streakDays >= 14 ? 'Two weeks strong.' : 'Week one down. The patterns are sticking.'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {weekDots.map(d => (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full border ${
                  d.completed ? 'bg-success border-success' :
                  d.isFuture ? 'border-card-border bg-transparent' :
                  'border-card-border bg-card-border/30'
                }`} />
                <span className="text-[9px] text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested cadence */}
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 mb-6">
          <p className="text-xs font-medium text-accent mb-1">Suggested this week</p>
          <p className="text-xs text-muted">
            {history.length < 3
              ? 'Start with a Quick Build to get the feel, then try a Standard Build.'
              : 'Standard Build midweek + one more session on the weekend. ~20 min each.'}
          </p>
        </div>

        {/* Automate My Workflow */}
        <button
          onClick={() => setView('workflows')}
          className="w-full rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 text-left transition-all hover:border-purple-500/40 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-purple-400">Automate My Workflow</h3>
              <p className="text-xs text-muted mt-0.5">
                Bring a real manual process from your job — get a guided architecture consultation.
              </p>
            </div>
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Challenge size cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['flash', 'quick', 'standard', 'deep'] as ChallengeSize[]).map(size => {
            const info = SIZE_INFO[size]
            return (
              <button
                key={size}
                onClick={() => startChallenge(size)}
                disabled={loading}
                className="group rounded-xl border border-card-border bg-card-bg p-5 text-left transition-all hover:border-accent/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium group-hover:text-accent transition-colors">{info.title}</h3>
                  <span className="text-[10px] text-accent">{info.time}</span>
                </div>
                <p className="text-xs text-muted mb-2">{info.desc}</p>
                <p className="text-[10px] text-muted">{info.phases}</p>
              </button>
            )
          })}
        </div>

        {loading && (
          <div className="text-center py-6">
            <div className="inline-flex items-center gap-2 text-sm text-muted">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating challenge with web research...
            </div>
          </div>
        )}

        {/* Completion counts */}
        <div className="flex gap-3 mb-6">
          {(['flash', 'quick', 'standard', 'deep'] as ChallengeSize[]).map(size => (
            <div key={size} className="flex-1 rounded-lg border border-card-border bg-card-bg p-3 text-center">
              <p className="text-lg font-semibold">{sizeCounts[size]}</p>
              <p className="text-[10px] text-muted">{SIZE_INFO[size].title}</p>
            </div>
          ))}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full mb-3"
            >
              <h3 className="text-sm font-medium">Challenge History ({history.length})</h3>
              <svg className={`w-4 h-4 text-muted transition-transform ${showHistory ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showHistory && (
              <div className="space-y-2">
                {history.slice(0, 15).map((h, i) => (
                  <div key={`${h.challengeId}-${i}`} className="rounded-xl border border-card-border bg-card-bg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                          {SIZE_INFO[h.size]?.title || h.size}
                        </span>
                        <span className="text-[10px] text-muted">
                          {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <span className={`text-xs font-mono ${
                        h.overallScore >= 4 ? 'text-success' : h.overallScore >= 3 ? 'text-warning' : 'text-red-400'
                      }`}>
                        {h.overallScore}/5
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate">{h.scenarioTitle}</p>
                    {h.keyLesson && (
                      <p className="text-[10px] text-accent mt-1 italic">{h.keyLesson}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── RENDER: Flash Review ─────────────────────────────────────

  if (view === 'flash' && flashChallenge) {
    const correct = flashChallenge.questions.filter((q, i) => flashAnswers[i] === q.correctIndex).length
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setView('home')} className="text-xs text-muted hover:text-foreground">
            &larr; Back to lab
          </button>
          <span className="text-xs text-muted font-mono">{formatTime(elapsed)}</span>
        </div>

        <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
          <h3 className="text-sm font-medium mb-2">Flash Review</h3>
          <p className="text-xs text-muted mb-4">{flashChallenge.scenario}</p>

          {flashChallenge.diagramSvg && (
            <div
              className="mb-4 rounded-lg border border-card-border bg-background p-4 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: flashChallenge.diagramSvg }}
            />
          )}
        </div>

        <div className="space-y-4">
          {flashChallenge.questions.map((q, qi) => (
            <div key={qi} className="rounded-xl border border-card-border bg-card-bg p-5">
              <p className="text-sm font-medium mb-3">{q.question}</p>
              <div className="space-y-2 mb-3">
                {q.options.map((opt, oi) => {
                  let style = 'border-card-border hover:border-accent/30'
                  if (flashSubmitted) {
                    if (oi === q.correctIndex) style = 'border-success/50 bg-success/5'
                    else if (oi === flashAnswers[qi] && flashAnswers[qi] !== q.correctIndex)
                      style = 'border-red-400/50 bg-red-400/5'
                    else style = 'border-card-border opacity-50'
                  } else if (oi === flashAnswers[qi]) {
                    style = 'border-accent bg-accent/5'
                  }
                  return (
                    <button
                      key={oi}
                      onClick={() => {
                        if (flashSubmitted) return
                        const a = [...flashAnswers]; a[qi] = oi; setFlashAnswers(a)
                      }}
                      disabled={flashSubmitted}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${style}`}
                    >
                      <span className="text-muted mr-2 font-mono text-xs">{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {!flashSubmitted && (
                <textarea
                  value={flashExplanations[qi]}
                  onChange={e => {
                    const exps = [...flashExplanations]; exps[qi] = e.target.value; setFlashExplanations(exps)
                  }}
                  placeholder="Explain your reasoning..."
                  className="w-full px-3 py-2 rounded-lg border border-card-border bg-background text-xs resize-none focus:outline-none focus:border-accent"
                  rows={2}
                />
              )}
              {flashSubmitted && (
                <div className="p-3 rounded-lg bg-success/5 border border-success/10 mt-2">
                  <p className="text-xs text-muted">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {!flashSubmitted ? (
          <button
            onClick={submitFlash}
            disabled={flashAnswers.some(a => a === null)}
            className="w-full mt-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40"
          >
            Submit Answers
          </button>
        ) : (
          <div className="mt-4 rounded-xl border border-card-border bg-card-bg p-5 text-center">
            <p className="text-2xl font-semibold mb-1">{correct}/{flashChallenge.questions.length}</p>
            <p className="text-xs text-muted mb-3">Correct</p>
            <button
              onClick={() => setView('home')}
              className="text-xs text-accent hover:text-accent-hover font-medium"
            >
              Back to lab
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── RENDER: Challenge ────────────────────────────────────────

  if (view === 'challenge' && challenge) {
    const showAdvanced = challengeSize === 'standard' || challengeSize === 'deep'

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setView('home')} className="text-xs text-muted hover:text-foreground">
            &larr; Back to lab
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
              {SIZE_INFO[challengeSize].title}
            </span>
            <span className="text-xs text-muted font-mono">{formatTime(elapsed)}</span>
          </div>
        </div>

        {/* Phase indicators */}
        <div className="flex gap-2 mb-6">
          {['design', ...(showAdvanced ? ['stress-test'] : []), ...(challengeSize === 'deep' ? ['optimize'] : [])].map((p, i) => (
            <div key={p} className={`flex-1 h-1.5 rounded-full ${
              p === phase ? 'bg-accent' :
              (['design', 'stress-test', 'optimize'].indexOf(p) < ['design', 'stress-test', 'optimize'].indexOf(phase))
                ? 'bg-success' : 'bg-card-border'
            }`}>
              <span className="sr-only">Phase {i + 1}: {p}</span>
            </div>
          ))}
        </div>

        {/* Scenario */}
        <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
          <p className="text-sm leading-relaxed">{challenge.scenario}</p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-background border border-card-border">
              <p className="text-[10px] text-muted mb-0.5">Token budget</p>
              <p className="text-xs font-medium">{challenge.constraints.tokenBudget}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-card-border">
              <p className="text-[10px] text-muted mb-0.5">Latency target</p>
              <p className="text-xs font-medium">{challenge.constraints.latencyTarget}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-card-border">
              <p className="text-[10px] text-muted mb-0.5">Compliance</p>
              <p className="text-xs font-medium">{challenge.constraints.compliance}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] text-muted mb-1.5">Available tools</p>
            <div className="flex flex-wrap gap-1.5">
              {challenge.availableTools.map(t => (
                <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-400">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── DESIGN PHASE ──────────────────────────────────── */}
        {phase === 'design' && (
          <div>
            <h3 className="text-sm font-medium mb-4">Phase 1: Design Your Architecture</h3>

            {/* Agent cards */}
            <div className="space-y-3 mb-4">
              {agents.map((agent, idx) => (
                <div key={agent.id} className="rounded-xl border border-card-border bg-card-bg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-muted font-mono">Agent #{idx + 1}</span>
                    {agents.length > 1 && (
                      <button onClick={() => removeAgent(agent.id)}
                        className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      value={agent.name}
                      onChange={e => updateAgent(agent.id, 'name', e.target.value)}
                      placeholder="Agent name/role"
                      className="text-sm px-3 py-2 rounded-lg border border-card-border bg-background focus:outline-none focus:border-accent"
                    />
                    <select
                      value={agent.modelTier}
                      onChange={e => updateAgent(agent.id, 'modelTier', e.target.value)}
                      className="text-sm px-3 py-2 rounded-lg border border-card-border bg-background focus:outline-none focus:border-accent"
                    >
                      <option value="opus">Opus (highest capability)</option>
                      <option value="sonnet">Sonnet (balanced)</option>
                      <option value="haiku">Haiku (fast/cheap)</option>
                    </select>
                  </div>

                  <p className="text-[10px] text-muted mb-1.5">Assign tools</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {challenge.availableTools.map(tool => (
                      <button
                        key={tool}
                        onClick={() => toggleTool(agent.id, tool)}
                        className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                          agent.tools.includes(tool)
                            ? 'bg-accent text-white'
                            : 'bg-card-border text-muted hover:text-foreground'
                        }`}
                      >
                        {tool}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={agent.responsibilities}
                    onChange={e => updateAgent(agent.id, 'responsibilities', e.target.value)}
                    placeholder="What is this agent responsible for?"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-card-border bg-background resize-none focus:outline-none focus:border-accent"
                    rows={2}
                  />

                  {idx > 0 && (
                    <div className="mt-2">
                      <label className="text-[10px] text-muted">Reports to</label>
                      <select
                        value={agent.reportsTo}
                        onChange={e => updateAgent(agent.id, 'reportsTo', e.target.value)}
                        className="w-full text-xs mt-1 px-3 py-2 rounded-lg border border-card-border bg-background focus:outline-none focus:border-accent"
                      >
                        <option value="top-level">Top-level orchestrator</option>
                        {agents.filter(a => a.id !== agent.id).map(a => (
                          <option key={a.id} value={a.id}>{a.name || `Agent #${agents.indexOf(a) + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={addAgent}
              className="w-full py-2 rounded-lg border border-dashed border-card-border text-xs text-accent hover:border-accent/30 transition-colors mb-4">
              + Add Agent
            </button>

            {/* Delegation protocol */}
            <div className="mb-4">
              <label className="text-xs font-medium text-muted block mb-1.5">Delegation Protocol *</label>
              <textarea
                value={delegationProtocol}
                onChange={e => setDelegationProtocol(e.target.value)}
                placeholder="How does the orchestrator decide what to delegate? What info does each agent receive? What format do results come back in?"
                className="w-full text-sm px-4 py-3 rounded-lg border border-card-border bg-background resize-none focus:outline-none focus:border-accent"
                rows={4}
              />
            </div>

            {/* Advanced fields */}
            {showAdvanced && (
              <>
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted block mb-1.5">Human Checkpoints *</label>
                  <textarea
                    value={humanCheckpoints}
                    onChange={e => setHumanCheckpoints(e.target.value)}
                    placeholder="Where in the flow does a human review, approve, or intervene? Why at these points?"
                    className="w-full text-sm px-4 py-3 rounded-lg border border-card-border bg-background resize-none focus:outline-none focus:border-accent"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted block mb-1.5">Memory Strategy</label>
                  <textarea
                    value={memoryStrategy}
                    onChange={e => setMemoryStrategy(e.target.value)}
                    placeholder="How does the system handle context limits on long tasks? (e.g., summarization, persistence, agent handoff)"
                    className="w-full text-sm px-4 py-3 rounded-lg border border-card-border bg-background resize-none focus:outline-none focus:border-accent"
                    rows={3}
                  />
                </div>
              </>
            )}

            <button
              onClick={submitDesign}
              disabled={!isDesignValid || grading}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {grading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Grading your design...
                </>
              ) : 'Submit Design'}
            </button>

            {/* Design results */}
            {designGrade && (
              <div className="mt-6 space-y-4">
                {/* Score breakdown */}
                <div className="rounded-xl border border-card-border bg-card-bg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium">Design Grade</h4>
                    <span className={`text-lg font-semibold ${
                      designGrade.overall >= 4 ? 'text-success' : designGrade.overall >= 3 ? 'text-warning' : 'text-red-400'
                    }`}>
                      {designGrade.overall}/5
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      ['Architecture Pattern', designGrade.architecturePattern],
                      ['Model Tier Selection', designGrade.modelTierSelection],
                      ['Tool Routing', designGrade.toolRouting],
                      ['Delegation Clarity', designGrade.delegationClarity],
                      ...(designGrade.humanInTheLoop > 0 ? [['Human-in-the-Loop', designGrade.humanInTheLoop]] : []),
                      ...(designGrade.memoryStrategy > 0 ? [['Memory Strategy', designGrade.memoryStrategy]] : []),
                    ].map(([label, score]) => (
                      <div key={label as string} className="p-2 rounded-lg bg-background border border-card-border">
                        <p className="text-[10px] text-muted">{label as string}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-card-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              (score as number) >= 4 ? 'bg-success' : (score as number) >= 3 ? 'bg-warning' : 'bg-red-400'
                            }`} style={{ width: `${((score as number) / 5) * 100}%` }} />
                          </div>
                          <span className="text-xs font-mono">{score as number}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted">{designGrade.feedback}</p>
                </div>

                {/* Anthropic comparison */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">
                  <h4 className="text-xs font-medium text-purple-400 mb-2">What Anthropic would do differently</h4>
                  <p className="text-sm text-muted">{designGrade.anthropicComparison}</p>
                </div>

                {/* Side-by-side diagrams */}
                {(userDiagramSvg || refDiagramSvg) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-card-border bg-card-bg p-4">
                      <p className="text-[10px] font-medium text-muted mb-2">Your Design</p>
                      {userDiagramSvg ? (
                        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: userDiagramSvg }} />
                      ) : (
                        <p className="text-[10px] text-muted italic">Diagram generation failed</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                      <p className="text-[10px] font-medium text-accent mb-2">Reference Solution</p>
                      {refDiagramSvg ? (
                        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: refDiagramSvg }} />
                      ) : (
                        <p className="text-[10px] text-muted italic">Diagram generation failed</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Next phase or finish */}
                {showAdvanced && (
                  <button
                    onClick={startStressTest}
                    className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium"
                  >
                    Continue to Stress Test &rarr;
                  </button>
                )}
                {challengeSize === 'quick' && (
                  <button
                    onClick={() => setView('home')}
                    className="w-full py-2.5 rounded-lg border border-card-border text-sm font-medium hover:bg-white/5"
                  >
                    Back to Lab
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STRESS TEST PHASE ─────────────────────────────── */}
        {phase === 'stress-test' && (
          <div>
            <h3 className="text-sm font-medium mb-4">Phase 2: Stress Test Your Architecture</h3>

            {loadingStress ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center gap-2 text-sm text-muted">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating failure scenarios for your design...
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {stressScenarios.map((sc, si) => (
                  <div key={sc.id} className="rounded-xl border border-red-400/20 bg-red-400/5 p-5">
                    <p className="text-xs font-medium text-red-400 mb-2">Failure Scenario {si + 1}</p>
                    <p className="text-sm mb-4">{sc.scenario}</p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted block mb-1">What breaks? *</label>
                        <textarea
                          value={stressResponses[si]?.whatBreaks || ''}
                          onChange={e => {
                            const r = [...stressResponses]
                            r[si] = { ...r[si], whatBreaks: e.target.value }
                            setStressResponses(r)
                          }}
                          placeholder="What specifically fails in your design?"
                          className="w-full text-sm px-3 py-2 rounded-lg border border-card-border bg-background resize-none focus:outline-none focus:border-accent"
                          rows={2}
                          disabled={stressGrades.length > 0}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted block mb-1">Root cause *</label>
                        <textarea
                          value={stressResponses[si]?.rootCause || ''}
                          onChange={e => {
                            const r = [...stressResponses]
                            r[si] = { ...r[si], rootCause: e.target.value }
                            setStressResponses(r)
                          }}
                          placeholder="Why does your architecture allow this failure?"
                          className="w-full text-sm px-3 py-2 rounded-lg border border-card-border bg-background resize-none focus:outline-none focus:border-accent"
                          rows={2}
                          disabled={stressGrades.length > 0}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted block mb-1">Fix *</label>
                        <textarea
                          value={stressResponses[si]?.fix || ''}
                          onChange={e => {
                            const r = [...stressResponses]
                            r[si] = { ...r[si], fix: e.target.value }
                            setStressResponses(r)
                          }}
                          placeholder="What would you change to prevent or handle this?"
                          className="w-full text-sm px-3 py-2 rounded-lg border border-card-border bg-background resize-none focus:outline-none focus:border-accent"
                          rows={2}
                          disabled={stressGrades.length > 0}
                        />
                      </div>
                    </div>

                    {stressGrades[si] && (
                      <div className="mt-4 p-4 rounded-lg bg-accent/5 border border-accent/10">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono text-accent">
                            Diagnostic: {stressGrades[si].diagnosticAccuracy}/5
                          </span>
                          <span className="text-xs font-mono text-accent">
                            Fix: {stressGrades[si].fixQuality}/5
                          </span>
                        </div>
                        <p className="text-xs text-muted">{stressGrades[si].feedback}</p>
                      </div>
                    )}
                  </div>
                ))}

                {stressGrades.length === 0 && stressScenarios.length > 0 && (
                  <button
                    onClick={submitStressTest}
                    disabled={stressResponses.some(r => !r.whatBreaks.trim() || !r.rootCause.trim() || !r.fix.trim()) || grading}
                    className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {grading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Grading...
                      </>
                    ) : 'Submit Stress Test'}
                  </button>
                )}

                {stressGrades.length > 0 && (
                  <button
                    onClick={() => {
                      const stAvg = stressGrades.reduce((s, g) => s + (g.diagnosticAccuracy + g.fixQuality) / 2, 0) / stressGrades.length
                      finishChallenge(((designGrade?.overall || 0) + stAvg) / 2)
                    }}
                    className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium"
                  >
                    See Challenge Summary
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SUMMARY PHASE ─────────────────────────────────── */}
        {phase === 'summary' && (
          <div>
            <div className="rounded-xl border border-card-border bg-card-bg p-6 text-center mb-6">
              <h3 className="text-sm font-medium mb-4">Challenge Complete</h3>
              <p className={`text-4xl font-semibold ${
                (history[0]?.overallScore || 0) >= 4 ? 'text-success' :
                (history[0]?.overallScore || 0) >= 3 ? 'text-warning' : 'text-red-400'
              }`}>
                {history[0]?.overallScore || 0}/5
              </p>
              <p className="text-xs text-muted mt-2">Overall Score</p>

              <div className="grid grid-cols-2 gap-3 mt-6 text-left">
                <div className="p-3 rounded-lg bg-success/5 border border-success/10">
                  <p className="text-[10px] text-success font-medium">Strongest area</p>
                  <p className="text-xs text-muted mt-1">
                    {designGrade && (
                      Object.entries({
                        'Architecture': designGrade.architecturePattern,
                        'Model Selection': designGrade.modelTierSelection,
                        'Tool Routing': designGrade.toolRouting,
                        'Delegation': designGrade.delegationClarity,
                      }).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-400/5 border border-red-400/10">
                  <p className="text-[10px] text-red-400 font-medium">Focus next time</p>
                  <p className="text-xs text-muted mt-1">
                    {designGrade && (
                      Object.entries({
                        'Architecture': designGrade.architecturePattern,
                        'Model Selection': designGrade.modelTierSelection,
                        'Tool Routing': designGrade.toolRouting,
                        'Delegation': designGrade.delegationClarity,
                      }).sort(([,a], [,b]) => a - b)[0]?.[0] || 'N/A'
                    )}
                  </p>
                </div>
              </div>

              {designGrade?.feedback && (
                <div className="mt-4 p-4 rounded-lg bg-accent/5 border border-accent/10 text-left">
                  <p className="text-[10px] font-medium text-accent mb-1">Key lesson</p>
                  <p className="text-xs text-muted">{designGrade.feedback.split('.').slice(0, 2).join('.') + '.'}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setView('home')}
                className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium"
              >
                Back to Lab
              </button>
              <button
                onClick={() => startChallenge(challengeSize)}
                className="flex-1 py-2.5 rounded-lg border border-card-border text-sm font-medium hover:bg-white/5"
              >
                New {SIZE_INFO[challengeSize].title}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── RENDER: Workflows ──────────────────────────────────────

  if (view === 'workflows') {
    return <WorkflowBuilder onBack={() => setView('home')} />
  }

  return null
}
