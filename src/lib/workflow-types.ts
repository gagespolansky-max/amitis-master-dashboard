export interface WorkflowProject {
  id: string
  title: string
  status: 'Designed' | 'Building' | 'Live' | 'Needs revision'
  mode: 'teaching' | 'express'
  createdAt: string
  updatedAt: string

  // Step 1: Intake
  intake: {
    processDescription: string
    currentSystems: string
    commonSystems: string[]
    dataFormats: string[]
    frequency: string
    manualTime: string
    hardestPart: string
    successCriteria: string
    deterministicAccuracy: 'yes' | 'no' | 'not-sure'
    technicalComfort: 'follow-instructions' | 'write-scripts' | 'build-apps'
  }

  // Step 1 response
  clarifyingQuestions?: string
  clarifyingAnswers?: string

  // Step 2: Decomposition
  decomposition?: DecomposedStep[]
  decompositionNarrative?: string

  // Step 3: Tooling
  toolingRecommendation?: string
  toolingDetails?: ToolRecommendation[]

  // Step 4: Architecture
  recommendation?: string
  recommendationDiagramSvg?: string
  solutionType?: string
  architectureComponents?: unknown[]

  // Step 5: Implementation
  implementationPlan?: string

  // Step 6: Lesson
  lesson?: string
}

export interface DecomposedStep {
  number: number
  description: string
  type: string
  typeEmoji: string
  difficulty: string
  llmAppropriate: string
  reasoning: string
}

export interface ToolRecommendation {
  step: string
  tool: string
  whatItIs: string
  whyThisTool: string
  alternatives: string
  buildVsRuntime: string
  connections: string
  learnMore: string
}

export const COMMON_SYSTEMS = [
  'Gmail', 'Slack', 'Notion', 'Excel', 'Google Sheets',
  'Salesforce', 'Jira', 'Google Drive',
]

export const DATA_FORMATS = [
  'Spreadsheets (.xlsx, .csv)',
  'PDFs',
  'Emails (body text or attachments)',
  'API/dashboard exports',
  'Manual data entry from a screen',
  'Images/scanned documents',
  'Word documents',
  'Database queries',
  'I copy-paste between systems',
]

export const FREQUENCY_OPTIONS = [
  'Daily', 'Multiple times per week', 'Weekly', 'Biweekly',
  'Monthly', 'Ad-hoc/on-demand', 'Triggered by an event',
]

export const TIME_OPTIONS = [
  'Under 10 minutes', '10-30 minutes', '30-60 minutes',
  '1-2 hours', 'Half a day', 'Full day or more',
]

export const COMFORT_LEVELS = [
  { value: 'follow-instructions' as const, label: 'I can follow instructions in a terminal but don\'t write code from scratch' },
  { value: 'write-scripts' as const, label: 'I write scripts and use APIs' },
  { value: 'build-apps' as const, label: 'I build and deploy full applications' },
]
