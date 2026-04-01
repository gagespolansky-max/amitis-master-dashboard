'use client'

import { useState, useEffect } from 'react'
import {
  COMMON_SYSTEMS, DATA_FORMATS, FREQUENCY_OPTIONS, TIME_OPTIONS, COMFORT_LEVELS,
  type WorkflowProject, type DecomposedStep, type ToolRecommendation,
} from '../_lib/workflow-types'

// ── Storage ──────────────────────────────────────────────────────

function loadWorkflows(): WorkflowProject[] {
  if (typeof window === 'undefined') return []
  const idx = localStorage.getItem('my-workflows-index')
  if (!idx) return []
  const ids: string[] = JSON.parse(idx)
  return ids
    .map(id => { const s = localStorage.getItem(`my-workflows:${id}`); return s ? JSON.parse(s) : null })
    .filter(Boolean) as WorkflowProject[]
}

function saveWorkflow(wf: WorkflowProject) {
  wf.updatedAt = new Date().toISOString()
  localStorage.setItem(`my-workflows:${wf.id}`, JSON.stringify(wf))
  const idx = localStorage.getItem('my-workflows-index')
  const ids: string[] = idx ? JSON.parse(idx) : []
  if (!ids.includes(wf.id)) { ids.unshift(wf.id); localStorage.setItem('my-workflows-index', JSON.stringify(ids)) }
}

// ── Main Component ───────────────────────────────────────────────

type WfView = 'list' | 'intake' | 'guided'
type GuidedStep = 1 | 2 | 3 | 4 | 5 | 6

const STEP_LABELS = ['Understand', 'Decompose', 'Tooling', 'Architecture', 'Implement', 'Learn']

export default function WorkflowBuilder({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<WfView>('list')
  const [workflows, setWorkflows] = useState<WorkflowProject[]>([])
  const [current, setCurrent] = useState<WorkflowProject | null>(null)
  const [guidedStep, setGuidedStep] = useState<GuidedStep>(1)
  const [loading, setLoading] = useState(false)
  const [expressMode, setExpressMode] = useState(false)
  const [sessionStart, setSessionStart] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Intake
  const [processDesc, setProcessDesc] = useState('')
  const [currentSystems, setCurrentSystems] = useState('')
  const [commonSystems, setCommonSystems] = useState<string[]>([])
  const [dataFormats, setDataFormats] = useState<string[]>([])
  const [otherDataFormat, setOtherDataFormat] = useState('')
  const [frequency, setFrequency] = useState('')
  const [manualTime, setManualTime] = useState('')
  const [hardestPart, setHardestPart] = useState('')
  const [successCriteria, setSuccessCriteria] = useState('')
  const [deterministicAccuracy, setDeterministicAccuracy] = useState<'yes' | 'no' | 'not-sure'>('not-sure')
  const [technicalComfort, setTechnicalComfort] = useState<'follow-instructions' | 'write-scripts' | 'build-apps'>('follow-instructions')

  // Step responses
  const [clarifyingResponse, setClarifyingResponse] = useState('')
  const [clarifyingAnswers, setClarifyingAnswers] = useState('')
  const [decomposition, setDecomposition] = useState<DecomposedStep[]>([])
  const [decompositionNarrative, setDecompositionNarrative] = useState('')
  const [toolingNarrative, setToolingNarrative] = useState('')
  const [toolingDetails, setToolingDetails] = useState<ToolRecommendation[]>([])
  const [expandedTool, setExpandedTool] = useState<number | null>(null)
  const [recommendation, setRecommendation] = useState('')
  const [solutionType, setSolutionType] = useState('')
  const [architectureComponents, setArchitectureComponents] = useState<unknown[]>([])
  const [diagramSvg, setDiagramSvg] = useState('')
  const [implementationPlan, setImplementationPlan] = useState('')
  const [lesson, setLesson] = useState('')

  useEffect(() => { setWorkflows(loadWorkflows()) }, [])
  useEffect(() => {
    if (!sessionStart) return
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000)
    return () => clearInterval(i)
  }, [sessionStart])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  function toggleCommonSystem(sys: string) {
    setCommonSystems(prev => prev.includes(sys) ? prev.filter(s => s !== sys) : [...prev, sys])
  }
  function toggleDataFormat(fmt: string) {
    setDataFormats(prev => prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt])
  }

  function startNew() {
    setProcessDesc(''); setCurrentSystems(''); setCommonSystems([]); setDataFormats([])
    setOtherDataFormat(''); setFrequency(''); setManualTime(''); setHardestPart('')
    setSuccessCriteria(''); setDeterministicAccuracy('not-sure'); setTechnicalComfort('follow-instructions')
    setClarifyingResponse(''); setClarifyingAnswers(''); setDecomposition([])
    setDecompositionNarrative(''); setToolingNarrative(''); setToolingDetails([])
    setRecommendation(''); setSolutionType(''); setArchitectureComponents([])
    setDiagramSvg(''); setImplementationPlan(''); setLesson('')
    setGuidedStep(1); setView('intake'); setSessionStart(Date.now())
  }

  function openWorkflow(wf: WorkflowProject) {
    setCurrent(wf)
    setProcessDesc(wf.intake.processDescription)
    setCurrentSystems(wf.intake.currentSystems)
    setCommonSystems(wf.intake.commonSystems || [])
    setDataFormats(wf.intake.dataFormats || [])
    setFrequency(wf.intake.frequency)
    setManualTime(wf.intake.manualTime)
    setHardestPart(wf.intake.hardestPart)
    setSuccessCriteria(wf.intake.successCriteria)
    setDeterministicAccuracy(wf.intake.deterministicAccuracy)
    setTechnicalComfort(wf.intake.technicalComfort || 'follow-instructions')
    setClarifyingResponse(wf.clarifyingQuestions || '')
    setClarifyingAnswers(wf.clarifyingAnswers || '')
    setDecomposition(wf.decomposition || [])
    setDecompositionNarrative(wf.decompositionNarrative || '')
    setToolingNarrative(wf.toolingRecommendation || '')
    setToolingDetails(wf.toolingDetails || [])
    setRecommendation(wf.recommendation || '')
    setSolutionType(wf.solutionType || '')
    setDiagramSvg(wf.recommendationDiagramSvg || '')
    setImplementationPlan(wf.implementationPlan || '')
    setLesson(wf.lesson || '')

    if (wf.lesson) setGuidedStep(6)
    else if (wf.implementationPlan) setGuidedStep(5)
    else if (wf.recommendation) setGuidedStep(4)
    else if (wf.toolingRecommendation) setGuidedStep(3)
    else if (wf.decomposition?.length) setGuidedStep(2)
    else setGuidedStep(1)

    setView('guided'); setSessionStart(Date.now())
  }

  function updateStatus(id: string, status: WorkflowProject['status']) {
    const wf = workflows.find(w => w.id === id)
    if (!wf) return
    wf.status = status; saveWorkflow(wf); setWorkflows(loadWorkflows())
  }

  function getIntake() {
    return {
      processDescription: processDesc,
      currentSystems,
      commonSystems,
      dataFormats: [...dataFormats, ...(otherDataFormat ? [otherDataFormat] : [])],
      frequency, manualTime, hardestPart, successCriteria, deterministicAccuracy, technicalComfort,
    }
  }

  // ── API calls ──────────────────────────────────────────────

  async function submitIntake() {
    setLoading(true)
    const intake = getIntake()
    try {
      const resp = await fetch('/operations/enablement/lab/api/workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'clarify', context: intake, express: expressMode }),
      })
      const data = await resp.json()
      setClarifyingResponse(data.response || '')
      const wf: WorkflowProject = {
        id: current?.id || `wf-${Date.now()}`, title: processDesc.slice(0, 60),
        status: 'Designed', mode: expressMode ? 'express' : 'teaching',
        createdAt: current?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
        intake, clarifyingQuestions: data.response,
      }
      setCurrent(wf); saveWorkflow(wf); setWorkflows(loadWorkflows())
      setView('guided'); setGuidedStep(1)
    } catch { /* failed */ }
    setLoading(false)
  }

  async function submitClarifying() {
    if (!current) return; setLoading(true)
    current.clarifyingAnswers = clarifyingAnswers; saveWorkflow(current)
    try {
      const resp = await fetch('/operations/enablement/lab/api/workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'decompose', context: { ...current.intake, clarifyingAnswers }, express: expressMode }),
      })
      const data = await resp.json()
      setDecomposition(data.steps || []); setDecompositionNarrative(data.narrative || '')
      current.decomposition = data.steps; current.decompositionNarrative = data.narrative
      saveWorkflow(current); setGuidedStep(2)
    } catch { /* failed */ }
    setLoading(false)
  }

  async function submitDecomposition() {
    if (!current) return; setLoading(true)
    try {
      const resp = await fetch('/operations/enablement/lab/api/workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'tooling',
          context: { ...current.intake, decomposition, clarifyingAnswers },
          express: expressMode,
        }),
      })
      const data = await resp.json()
      setToolingNarrative(data.narrative || ''); setToolingDetails(data.tools || [])
      current.toolingRecommendation = data.narrative; current.toolingDetails = data.tools
      saveWorkflow(current); setGuidedStep(3)
    } catch { /* failed */ }
    setLoading(false)
  }

  async function submitTooling() {
    if (!current) return; setLoading(true)
    try {
      const resp = await fetch('/operations/enablement/lab/api/workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'recommend',
          context: { ...current.intake, decomposition, tooling: toolingDetails, clarifyingAnswers },
          express: expressMode,
        }),
      })
      const data = await resp.json()
      setRecommendation(data.recommendation || ''); setSolutionType(data.solutionType || '')
      setArchitectureComponents(data.architectureComponents || [])
      current.recommendation = data.recommendation; current.solutionType = data.solutionType
      current.architectureComponents = data.architectureComponents

      // Generate diagram
      const diagResp = await fetch('/operations/enablement/lab/api/workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'diagram',
          context: { processDescription: current.intake.processDescription, solutionType: data.solutionType, architectureComponents: data.architectureComponents },
        }),
      })
      const diagData = await diagResp.json()
      setDiagramSvg(diagData.svg || ''); current.recommendationDiagramSvg = diagData.svg
      saveWorkflow(current); setGuidedStep(4)
    } catch { /* failed */ }
    setLoading(false)
  }

  async function generateImplementation() {
    if (!current) return; setLoading(true)
    try {
      const resp = await fetch('/operations/enablement/lab/api/workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'implement',
          context: { ...current.intake, solutionType, recommendation, architectureComponents, decomposition, tooling: toolingDetails },
          express: expressMode,
        }),
      })
      const data = await resp.json()
      setImplementationPlan(data.plan || ''); current.implementationPlan = data.plan
      saveWorkflow(current); setGuidedStep(5)
    } catch { /* failed */ }
    setLoading(false)
  }

  async function generateLesson() {
    if (!current) return; setLoading(true)
    try {
      const resp = await fetch('/operations/enablement/lab/api/workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'lesson',
          context: { processDescription: current.intake.processDescription, solutionType, decomposition, deterministicAccuracy: current.intake.deterministicAccuracy, tooling: toolingDetails },
        }),
      })
      const data = await resp.json()
      setLesson(data.lesson || ''); current.lesson = data.lesson; saveWorkflow(current)

      // Update learner profile + streak
      const stored = localStorage.getItem('learner-profile')
      const profile = stored ? JSON.parse(stored) : { topics: {}, updatedAt: '' }
      for (const topic of ['Orchestration Patterns', 'Tool Routing', 'Cost Optimization']) {
        if (!profile.topics[topic]) profile.topics[topic] = { correct: 0, total: 0, explanationScores: [], lastAttempt: '' }
        profile.topics[topic].total += 1; profile.topics[topic].correct += 1
        profile.topics[topic].explanationScores.push(4); profile.topics[topic].lastAttempt = new Date().toISOString()
      }
      profile.updatedAt = new Date().toISOString()
      localStorage.setItem('learner-profile', JSON.stringify(profile))

      const streak = localStorage.getItem('lab-streak')
      const s = streak ? JSON.parse(streak) : { dates: [] }
      s.dates.push({ date: new Date().toISOString().slice(0, 10), sessionType: 'workflow' })
      localStorage.setItem('lab-streak', JSON.stringify(s))
      setGuidedStep(6)
    } catch { /* failed */ }
    setLoading(false)
  }

  const isIntakeValid = processDesc.trim().length >= 20 && (currentSystems.trim() || commonSystems.length > 0) && dataFormats.length > 0 && frequency && manualTime

  // ── Spinner ────────────────────────────────────────────────
  const Spinner = () => (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )

  // ── RENDER: List ───────────────────────────────────────────
  if (view === 'list') {
    const completedCount = workflows.length
    return (
      <div>
        <button onClick={onBack} className="text-xs text-muted hover:text-foreground mb-4">&larr; Back to Architecture Lab</button>
        <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
          <h2 className="text-sm font-medium mb-1">Automate My Workflow</h2>
          <p className="text-xs text-muted">
            Bring a real manual process from your job. Describe it in your own words — no technical knowledge needed.
            The AI walks you through decomposing it, recommends the right tools, designs the architecture, and gives you an implementation plan.
          </p>
          <p className="text-[10px] text-muted/60 mt-2">
            {expressMode ? 'Express mode: ~8-12 min' : 'Teaching mode: ~20-35 min'}
          </p>
          {completedCount >= 5 && !expressMode && (
            <div className="mt-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
              <p className="text-xs text-muted">
                You&apos;ve designed {completedCount} workflows.{' '}
                <button onClick={() => setExpressMode(true)} className="text-accent font-medium">Try Express Mode</button> for faster results.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <button onClick={startNew} className="text-xs font-medium text-accent hover:text-accent-hover px-3 py-1.5 rounded-lg border border-accent/20 hover:border-accent/40">
            + New Workflow
          </button>
          {completedCount >= 5 && (
            <button onClick={() => setExpressMode(!expressMode)} className={`text-[10px] px-2 py-1 rounded-full ${expressMode ? 'bg-accent text-white' : 'bg-card-border text-muted'}`}>
              {expressMode ? 'Express' : 'Teaching'}
            </button>
          )}
        </div>

        {workflows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-card-border p-8 text-center">
            <p className="text-sm text-muted mb-2">No workflows yet</p>
            <p className="text-xs text-muted/60">Click &quot;+ New Workflow&quot; to describe a manual process and get a guided architecture consultation.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {workflows.map(wf => {
              const statusStyle = { 'Designed': 'bg-accent/10 text-accent', 'Building': 'bg-warning/10 text-warning', 'Live': 'bg-success/10 text-success', 'Needs revision': 'bg-red-400/10 text-red-400' }[wf.status]
              return (
                <div key={wf.id} className="rounded-xl border border-card-border bg-card-bg p-4 flex items-center justify-between">
                  <button onClick={() => openWorkflow(wf)} className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle}`}>{wf.status}</span>
                      {wf.solutionType && <span className="text-[10px] text-muted px-2 py-0.5 rounded-full bg-card-border">{wf.solutionType}</span>}
                      <span className="text-[10px] text-muted">{new Date(wf.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <p className="text-sm truncate">{wf.title}</p>
                  </button>
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    {(['Designed', 'Building', 'Live', 'Needs revision'] as const).map(s => (
                      <button key={s} onClick={() => updateStatus(wf.id, s)} className={`text-[9px] px-1.5 py-0.5 rounded ${wf.status === s ? 'bg-accent/20 text-accent' : 'text-muted hover:text-foreground hover:bg-white/5'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── RENDER: Intake ─────────────────────────────────────────
  if (view === 'intake') {
    return (
      <div>
        <button onClick={() => setView('list')} className="text-xs text-muted hover:text-foreground mb-4">&larr; Back</button>
        <h3 className="text-sm font-medium mb-1">Describe Your Manual Process</h3>
        <p className="text-xs text-muted mb-6">No technical knowledge needed — just describe what you do in your own words.</p>

        <div className="space-y-5">
          {/* Process description */}
          <div>
            <label className="text-xs font-medium block mb-1.5">What process do you want to automate? *</label>
            <textarea value={processDesc} onChange={e => setProcessDesc(e.target.value)}
              placeholder="e.g., Every Monday I pull data from our CRM, cross-reference it with our project tracker, identify stale deals, write a summary of each, and send a Slack message to the account owner..."
              className="w-full text-sm px-4 py-3 rounded-lg border border-card-border bg-card-bg resize-none focus:outline-none focus:border-accent" rows={4} />
            <p className="text-[10px] text-muted mt-1">Be specific — what do you open, click through, copy, calculate, or produce?</p>
          </div>

          {/* Current systems */}
          <div>
            <label className="text-xs font-medium block mb-1.5">What systems does your data live in and where do you do this work? *</label>
            <textarea value={currentSystems} onChange={e => setCurrentSystems(e.target.value)}
              placeholder="List everything you touch — every app, spreadsheet, portal, inbox, database, or tool. Don't worry about being technical. Just describe what you open and interact with."
              className="w-full text-sm px-4 py-3 rounded-lg border border-card-border bg-card-bg resize-none focus:outline-none focus:border-accent" rows={3} />
            <p className="text-[10px] text-muted mt-2 mb-1">Quick-select common systems:</p>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SYSTEMS.map(sys => (
                <button key={sys} onClick={() => toggleCommonSystem(sys)}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${commonSystems.includes(sys) ? 'bg-accent text-white' : 'bg-card-border text-muted hover:text-foreground'}`}>
                  {sys}
                </button>
              ))}
            </div>
          </div>

          {/* Data formats */}
          <div>
            <label className="text-xs font-medium block mb-1.5">What format does the data arrive in? *</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DATA_FORMATS.map(fmt => (
                <button key={fmt} onClick={() => toggleDataFormat(fmt)}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${dataFormats.includes(fmt) ? 'bg-accent text-white' : 'bg-card-border text-muted hover:text-foreground'}`}>
                  {fmt}
                </button>
              ))}
            </div>
            <input value={otherDataFormat} onChange={e => setOtherDataFormat(e.target.value)}
              placeholder="Other format (optional)" className="w-full text-xs px-3 py-2 rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-accent" />
          </div>

          {/* Frequency + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1.5">How often? *</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-accent">
                <option value="">Select...</option>
                {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Manual time? *</label>
              <select value={manualTime} onChange={e => setManualTime(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-card-border bg-card-bg focus:outline-none focus:border-accent">
                <option value="">Select...</option>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Pain points */}
          <div>
            <label className="text-xs font-medium block mb-1.5">What&apos;s the hardest or most annoying part?</label>
            <textarea value={hardestPart} onChange={e => setHardestPart(e.target.value)} placeholder="Optional" className="w-full text-xs px-3 py-2 rounded-lg border border-card-border bg-card-bg resize-none focus:outline-none focus:border-accent" rows={2} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5">What would &quot;done well&quot; look like?</label>
            <textarea value={successCriteria} onChange={e => setSuccessCriteria(e.target.value)} placeholder="Optional" className="w-full text-xs px-3 py-2 rounded-lg border border-card-border bg-card-bg resize-none focus:outline-none focus:border-accent" rows={2} />
          </div>

          {/* Deterministic accuracy */}
          <div>
            <label className="text-xs font-medium block mb-1.5">Does this involve financial calculations, compliance, or domains where the numbers must be exactly right? *</label>
            <div className="flex gap-2">
              {(['yes', 'no', 'not-sure'] as const).map(v => (
                <button key={v} onClick={() => setDeterministicAccuracy(v)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${deterministicAccuracy === v ? 'border-accent bg-accent/10 text-accent' : 'border-card-border text-muted hover:text-foreground'}`}>
                  {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Not sure'}
                </button>
              ))}
            </div>
          </div>

          {/* Technical comfort */}
          <div>
            <label className="text-xs font-medium block mb-1.5">What&apos;s your technical comfort level? *</label>
            <div className="space-y-1.5">
              {COMFORT_LEVELS.map(cl => (
                <button key={cl.value} onClick={() => setTechnicalComfort(cl.value)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors ${technicalComfort === cl.value ? 'border-accent bg-accent/10 text-accent' : 'border-card-border text-muted hover:text-foreground'}`}>
                  {cl.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={submitIntake} disabled={!isIntakeValid || loading}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Analyzing your process...</> : 'Submit & Get Clarifying Questions'}
          </button>
        </div>
      </div>
    )
  }

  // ── RENDER: Guided ─────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setView('list')} className="text-xs text-muted hover:text-foreground">&larr; Back</button>
        <span className="text-xs text-muted font-mono">{formatTime(elapsed)}</span>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-6">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1.5 rounded-full mb-1 ${i + 1 < guidedStep ? 'bg-success' : i + 1 === guidedStep ? 'bg-accent' : 'bg-card-border'}`} />
            <p className={`text-[9px] text-center ${i + 1 === guidedStep ? 'text-accent font-medium' : 'text-muted'}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Step 1: Clarify ─────────────────────────────────── */}
      {guidedStep === 1 && (
        <div>
          <h3 className="text-sm font-medium mb-4">Step 1: Understanding Your Process</h3>
          {clarifyingResponse && (
            <div className="rounded-xl border border-card-border bg-card-bg p-5 mb-4">
              <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{clarifyingResponse}</p>
            </div>
          )}
          <div className="mb-4">
            <label className="text-xs font-medium block mb-1.5">Your answers</label>
            <textarea value={clarifyingAnswers} onChange={e => setClarifyingAnswers(e.target.value)}
              placeholder="Answer each question above..." className="w-full text-sm px-4 py-3 rounded-lg border border-card-border bg-card-bg resize-none focus:outline-none focus:border-accent" rows={6} />
          </div>
          <button onClick={submitClarifying} disabled={!clarifyingAnswers.trim() || loading}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Decomposing your process...</> : 'This looks right — continue'}
          </button>
        </div>
      )}

      {/* ── Step 2: Decompose ───────────────────────────────── */}
      {guidedStep === 2 && (
        <div>
          <h3 className="text-sm font-medium mb-4">Step 2: Process Decomposition</h3>
          <div className="space-y-2 mb-4">
            {decomposition.map(step => {
              const diffStyle = { Easy: 'text-success', Medium: 'text-warning', Hard: 'text-red-400', 'Keep manual': 'text-muted' }[step.difficulty] || 'text-muted'
              const llmStyle = { Yes: 'bg-success/10 text-success', No: 'bg-red-400/10 text-red-400', Risky: 'bg-warning/10 text-warning' }[step.llmAppropriate] || 'bg-muted/10 text-muted'
              return (
                <div key={step.number} className="rounded-xl border border-card-border bg-card-bg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-sm mt-0.5">{step.typeEmoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Step {step.number}: {step.description}</p>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] text-muted px-2 py-0.5 rounded-full bg-card-border">{step.type}</span>
                        <span className={`text-[10px] font-medium ${diffStyle}`}>{step.difficulty}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${llmStyle}`}>LLM: {step.llmAppropriate}</span>
                      </div>
                      <p className="text-xs text-muted">{step.reasoning}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {decompositionNarrative && !expressMode && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 mb-4">
              <p className="text-xs font-medium text-accent mb-2">Key insight</p>
              <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{decompositionNarrative}</p>
            </div>
          )}
          <button onClick={submitDecomposition} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Researching tools for your workflow...</> : 'This looks right — recommend tools'}
          </button>
        </div>
      )}

      {/* ── Step 3: Tooling ─────────────────────────────────── */}
      {guidedStep === 3 && (
        <div>
          <h3 className="text-sm font-medium mb-4">Step 3: Recommended Tooling</h3>
          {toolingNarrative && (
            <div className="rounded-xl border border-card-border bg-card-bg p-5 mb-4">
              <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{toolingNarrative}</p>
            </div>
          )}
          {toolingDetails.length > 0 && (
            <div className="space-y-2 mb-4">
              {toolingDetails.map((tool, i) => (
                <div key={`${tool.tool}-${i}`} className="rounded-xl border border-card-border bg-card-bg overflow-hidden">
                  <button onClick={() => setExpandedTool(expandedTool === i ? null : i)}
                    className="w-full text-left p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium">{tool.tool}</span>
                        <span className="text-[10px] text-muted px-2 py-0.5 rounded-full bg-card-border">{tool.step}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${tool.buildVsRuntime?.toLowerCase().includes('build') ? 'bg-purple-500/10 text-purple-400' : 'bg-teal-500/10 text-teal-400'}`}>
                          {tool.buildVsRuntime?.toLowerCase().includes('build') ? 'Build-time' : 'Runtime'}
                        </span>
                      </div>
                      <p className="text-xs text-muted">{tool.whyThisTool?.split('.')[0]}.</p>
                    </div>
                    <svg className={`w-3 h-3 text-muted transition-transform shrink-0 ml-2 ${expandedTool === i ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedTool === i && (
                    <div className="px-4 pb-4 space-y-3 border-t border-card-border pt-3">
                      <div>
                        <p className="text-[10px] font-medium text-accent uppercase tracking-wider mb-1">What it is</p>
                        <p className="text-xs text-muted">{tool.whatItIs}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-accent uppercase tracking-wider mb-1">Why this tool</p>
                        <p className="text-xs text-muted">{tool.whyThisTool}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-red-400 uppercase tracking-wider mb-1">Alternatives considered</p>
                        <p className="text-xs text-muted">{tool.alternatives}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1">How it connects</p>
                        <p className="text-xs text-muted">{tool.connections}</p>
                      </div>
                      {tool.learnMore && (
                        <p className="text-[10px] text-muted">Learn more: {tool.learnMore}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <button onClick={submitTooling} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Designing architecture...</> : 'These tools make sense — show me the architecture'}
          </button>
        </div>
      )}

      {/* ── Step 4: Architecture ────────────────────────────── */}
      {guidedStep === 4 && (
        <div>
          <h3 className="text-sm font-medium mb-4">Step 4: Solution Architecture</h3>
          {solutionType && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 mb-4">
              <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1">Recommended pattern</p>
              <p className="text-sm font-medium">{solutionType}</p>
            </div>
          )}
          {recommendation && (
            <div className="rounded-xl border border-card-border bg-card-bg p-5 mb-4">
              <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{recommendation}</p>
            </div>
          )}
          {diagramSvg && (
            <div className="rounded-xl border border-card-border bg-card-bg p-4 mb-4">
              <p className="text-[10px] font-medium text-muted mb-2">Architecture Diagram</p>
              <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
            </div>
          )}
          <button onClick={generateImplementation} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Building implementation plan...</> : 'This makes sense — show me how to build it'}
          </button>
        </div>
      )}

      {/* ── Step 5: Implementation ──────────────────────────── */}
      {guidedStep === 5 && (
        <div>
          <h3 className="text-sm font-medium mb-4">Step 5: Implementation Plan</h3>
          {implementationPlan && (
            <div className="rounded-xl border border-card-border bg-card-bg p-5 mb-4">
              <div className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{implementationPlan}</div>
            </div>
          )}
          <button onClick={generateLesson} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Extracting lessons...</> : 'Continue — what did I just learn?'}
          </button>
        </div>
      )}

      {/* ── Step 6: Lesson ──────────────────────────────────── */}
      {guidedStep === 6 && (
        <div>
          <h3 className="text-sm font-medium mb-4">Step 6: What You Just Learned</h3>
          {lesson && (
            <div className="rounded-xl border border-success/20 bg-success/5 p-5 mb-4">
              <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{lesson}</p>
            </div>
          )}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 mb-4">
            <p className="text-xs text-muted">Workflow saved. Update its status as you build, or return to revise anytime.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('list')} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium">Back to My Workflows</button>
            <button onClick={startNew} className="flex-1 py-2.5 rounded-lg border border-card-border text-sm font-medium hover:bg-white/5">Automate Another Process</button>
          </div>
        </div>
      )}

      {loading && guidedStep > 1 && (
        <p className="mt-4 text-center text-[10px] text-muted">This may take 10-20 seconds — the AI is researching current tools and best practices.</p>
      )}
    </div>
  )
}
