export type ChallengeSize = 'flash' | 'quick' | 'standard' | 'deep'

export interface AgentDesign {
  id: string
  name: string
  modelTier: 'opus' | 'sonnet' | 'haiku'
  tools: string[]
  responsibilities: string
  reportsTo: string // agent id or 'orchestrator'
}

export interface DesignSubmission {
  agents: AgentDesign[]
  delegationProtocol: string
  humanCheckpoints: string
  memoryStrategy: string
}

export interface Challenge {
  id: string
  size: ChallengeSize
  scenario: string
  constraints: {
    tokenBudget: string
    latencyTarget: string
    compliance: string
  }
  availableTools: string[]
  evaluationCriteria: string[]
  referenceSolution: {
    architecture: string
    reasoning: string
    antiPatterns: string
    agents: { name: string; modelTier: string; tools: string[]; role: string }[]
    delegationProtocol: string
    humanCheckpoints: string
    memoryStrategy: string
  }
  generatedAt: string
}

export interface FlashChallenge {
  id: string
  scenario: string
  diagramSvg: string
  questions: {
    question: string
    options: string[]
    correctIndex: number
    explanation: string
  }[]
  generatedAt: string
}

export interface DesignGrade {
  architecturePattern: number
  modelTierSelection: number
  toolRouting: number
  delegationClarity: number
  humanInTheLoop: number
  memoryStrategy: number
  overall: number
  feedback: string
  anthropicComparison: string
}

export interface StressTestScenario {
  id: string
  scenario: string
  referenceAnswer: {
    whatBreaks: string
    rootCause: string
    fix: string
  }
}

export interface StressTestGrade {
  diagnosticAccuracy: number
  fixQuality: number
  feedback: string
}

export interface LabHistoryEntry {
  challengeId: string
  size: ChallengeSize
  scenarioTitle: string
  date: string
  designScore: number
  stressTestScore?: number
  optimizeScore?: number
  overallScore: number
  keyLesson: string
  industry: string
  topics: string[]
}

export interface ScenarioHistory {
  industry: string
  businessFunction: string
  primaryTools: string[]
  architecturePattern: string
  date: string
}

export interface LabStreak {
  dates: { date: string; sessionType: string }[]
}

export const ARCHITECTURE_PRINCIPLES = `You are an expert AI systems architect who designs agentic systems strictly following Anthropic's published best practices.

ORCHESTRATION PRINCIPLES:
- Default to the orchestrator-worker pattern: one lead agent (highest-capability model) that plans, delegates, and synthesizes, with task-scoped worker agents
- Workers are ephemeral and task-scoped, NOT persistent role-based specialists
- The orchestrator's delegation must be hyper-specific: each worker gets an objective, output format, tool guidance, and clear task boundaries
- Scale effort to complexity: simple tasks = 1 agent, complex tasks = multiple parallel workers
- Include explicit memory/persistence strategy for systems that might exceed context limits
- Human checkpoints belong at high-leverage decision points, not just at the end

TOOL ROUTING PRINCIPLES:
- Each tool should have exactly one owning agent — no shared free-for-all access
- Tool selection heuristics must be explicit
- Bad tool routing is the #1 failure mode

COST AND MODEL TIER PRINCIPLES:
- Always specify which model tier each agent uses (Opus/Sonnet/Haiku) and justify
- Orchestrators typically use the highest-capability model for planning
- Workers use cost-efficient models unless the task requires deep reasoning
- Multi-agent systems use ~15x more tokens than single-agent — only use when justified

FAILURE HANDLING PRINCIPLES:
- Every architecture must include at least one error handling path
- Tool failures need graceful degradation
- Context window exhaustion needs a visible strategy
- Agent output conflicts need a resolution mechanism

ANTI-PATTERNS TO AVOID:
- All agents connected to all tools (the "mesh" anti-pattern)
- Fixed role-based specialists when ephemeral task-scoped workers would work
- Human review only at the final output
- No memory strategy on complex multi-step tasks
- Same model tier for every agent regardless of task complexity
- Sequential execution where parallel would work`

export const DIAGRAM_STANDARDS = `Generate the diagram as clean SVG code:

LAYOUT:
- ViewBox width 680px. Height fits content + 40px padding.
- Max 4-6 agent nodes. Use vertical flow (top to bottom).
- Orchestrator at top, workers below, tools below workers, human checkpoints to the side.
- Min 60px vertical spacing between tiers, 20px horizontal between same-tier nodes.

COLOR CODING:
- Orchestrator/lead: fill="#7c3aed" (purple)
- Worker/subagents: fill="#0d9488" (teal)
- Tools/data: fill="#f97316" (coral)
- Human checkpoints: fill="#f59e0b" (amber)
- Memory/persistence: fill="#22c55e" (green)
- External I/O: fill="#6b7280" (gray)

NODES: rounded rects, rx=8, stroke-width=0.5. Agent nodes show name (14px bold) + model tier subtitle (12px). Tool nodes show name (14px bold).

CONNECTIONS:
- Delegation (orchestrator→worker): solid 1px purple stroke with arrowhead
- Data/query (agent→tool): solid 0.8px with arrowhead
- Return (worker→orchestrator): dashed 0.8px teal
- Human review: dashed amber
- Error/fallback: dotted red, annotated with fallback behavior

Include: title, model tiers on every agent, at least one error path, and a legend.`

export const INDUSTRIES = [
  'Financial services', 'Healthcare', 'Legal', 'E-commerce',
  'Media and content', 'Real estate', 'HR and recruiting',
  'Supply chain', 'Education', 'Government and nonprofit',
]
