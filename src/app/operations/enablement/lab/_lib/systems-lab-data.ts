export interface AgentRole {
  id: string
  title: string
  description: string
  tools: string[]
  mcpServers?: string[]
  skills?: string[]
  triggers?: string[]
}

export interface SystemBlueprint {
  id: string
  title: string
  description: string
  difficulty: 'starter' | 'intermediate' | 'advanced'
  businessFunction: string
  problem: string
  agents: AgentRole[]
  orchestration: string
  claudeCodeCommands: string[]
  walkthrough: string[]
}

export const claudeCodeToolkit = {
  commands: [
    { name: '/agent', description: 'Spawn a sub-agent to handle a specific task autonomously. Agents run in their own context and return results.' },
    { name: '/loop', description: 'Run a prompt or slash command on a recurring interval (e.g., /loop 5m /check-deploy). Great for polling, monitoring, babysitting.' },
    { name: 'CronCreate', description: 'Schedule a prompt to fire at a specific time or interval using cron syntax. Session-only — expires when Claude exits.' },
    { name: 'context: fork', description: 'Skill setting that runs a skill in an isolated sub-agent context. Keeps the main conversation clean.' },
    { name: 'Agent tool', description: 'Launch specialized sub-agents (Explore, Plan, general-purpose) for parallel research, code search, or complex tasks.' },
    { name: 'Headless mode', description: 'Run Claude Code non-interactively (CI/CD, scripts, automation). Combine with allowlisted tools for safe autonomous operation.' },
    { name: 'Skills', description: 'Custom /slash-commands defined in SKILL.md files. Reusable workflows, templates, and automations.' },
    { name: 'MCP servers', description: 'Connect Claude Code to external tools (Gmail, Notion, Slack, Attio, databases). Extends what Claude can read/write.' },
    { name: 'Hooks', description: 'Shell commands that auto-execute on Claude Code events (tool calls, file edits). Good for auto-formatting, notifications, guardrails.' },
    { name: 'CLAUDE.md', description: 'Persistent instructions loaded every session. Project conventions, behavior rules, domain context.' },
    { name: 'Memory system', description: 'File-based memory in ~/.claude/projects/. Persists learnings, user preferences, and project context across sessions.' },
    { name: 'Worktrees', description: 'Run agents in isolated git worktrees so they can make changes without affecting your main branch.' },
  ],
  patterns: [
    { name: 'Orchestrator + Specialists', description: 'One agent breaks down work, delegates to specialized sub-agents, and synthesizes results.' },
    { name: 'Pipeline', description: 'Sequential chain where each agent\'s output feeds the next. Good for data processing workflows.' },
    { name: 'Fan-out / Fan-in', description: 'Dispatch multiple agents in parallel, collect results, merge. Good for research and analysis.' },
    { name: 'Monitor + Actor', description: 'One agent watches for changes (/loop), triggers another agent to take action when conditions are met.' },
    { name: 'Human-in-the-Loop', description: 'Agent does the work, pauses for human review/approval at critical decision points.' },
  ],
}

export const systemBlueprints: SystemBlueprint[] = [
  {
    id: 'fund-returns-automation',
    title: 'Fund Returns Pipeline',
    description: 'Automate end-to-end fund returns processing: scan emails, extract data, reconcile, and update dashboards.',
    difficulty: 'intermediate',
    businessFunction: 'Portfolio',
    problem: 'You manually check emails for fund return statements, open PDFs, extract numbers, enter them into a spreadsheet, and update your dashboard. This takes hours each month.',
    agents: [
      {
        id: 'email-scanner',
        title: 'Email Scanner',
        description: 'Monitors Gmail for new fund return emails. Identifies which fund, extracts attachments.',
        tools: ['Gmail MCP', 'Bash'],
        mcpServers: ['Gmail'],
        triggers: ['/loop 2h or CronCreate every 4 hours'],
      },
      {
        id: 'pdf-extractor',
        title: 'PDF Extractor',
        description: 'Reads PDF attachments, extracts return figures, NAV, dates. Handles different fund formats.',
        tools: ['Read', 'Bash (pdfplumber)'],
        skills: ['/extract-returns'],
      },
      {
        id: 'reconciler',
        title: 'Data Reconciler',
        description: 'Cross-checks extracted data against prior months. Flags anomalies (e.g., return >5% different from prior month).',
        tools: ['Read', 'Grep'],
      },
      {
        id: 'updater',
        title: 'Dashboard Updater',
        description: 'Writes validated data to Notion database and triggers dashboard refresh.',
        tools: ['Notion MCP', 'Bash'],
        mcpServers: ['Notion'],
      },
    ],
    orchestration: 'Pipeline pattern. Email Scanner triggers PDF Extractor for each new email. Extractor feeds Reconciler. If reconciliation passes, Updater writes to Notion. If it flags an anomaly, pauses for human review.',
    claudeCodeCommands: ['/loop', 'CronCreate', 'Agent tool (parallel extraction)', 'MCP (Gmail, Notion)', 'Skills (/extract-returns)', 'Hooks (auto-format extracted data)'],
    walkthrough: [
      'Create a /scan-fund-emails skill that uses Gmail MCP to search for new fund return emails in the last 24 hours',
      'Create a /extract-returns skill that reads PDFs and extracts return data into structured JSON',
      'Set up a CronCreate job or /loop to run /scan-fund-emails every 4 hours',
      'When new emails are found, use the Agent tool to spawn parallel PDF extractors (one per fund)',
      'Create a reconciliation check that compares extracted values against historical data in Notion',
      'If everything checks out, use Notion MCP to write the data. If anomalies found, stop and alert you.',
    ],
  },
  {
    id: 'research-pipeline',
    title: 'Investment Research Assistant',
    description: 'Multi-agent system for fund vetting: gather data, analyze performance, generate a research memo.',
    difficulty: 'advanced',
    businessFunction: 'Research',
    problem: 'When evaluating a new fund, you manually search for info, pull performance data, check references, analyze strategy, and write up a memo. This takes days per fund.',
    agents: [
      {
        id: 'data-gatherer',
        title: 'Data Gatherer',
        description: 'Searches web for fund info, pulls data from Attio CRM, checks existing notes and call transcripts.',
        tools: ['WebSearch', 'WebFetch', 'Attio MCP'],
        mcpServers: ['Attio'],
      },
      {
        id: 'performance-analyst',
        title: 'Performance Analyst',
        description: 'Analyzes return data, calculates risk metrics (Sharpe, drawdown, correlation), compares to benchmarks.',
        tools: ['Bash (Python/pandas)', 'Read'],
      },
      {
        id: 'diligence-checker',
        title: 'Diligence Checker',
        description: 'Reviews operational details: AUM, team, strategy consistency, red flags, regulatory filings.',
        tools: ['WebSearch', 'WebFetch', 'Read'],
      },
      {
        id: 'memo-writer',
        title: 'Memo Writer',
        description: 'Synthesizes all agent outputs into a structured investment memo with recommendation.',
        tools: ['Write', 'Read'],
        skills: ['/write-memo'],
      },
    ],
    orchestration: 'Fan-out / Fan-in. Orchestrator dispatches Data Gatherer, Performance Analyst, and Diligence Checker in parallel (3 Agent calls). When all complete, Memo Writer synthesizes into a structured memo. Human reviews before finalizing.',
    claudeCodeCommands: ['Agent tool (3 parallel sub-agents)', 'Worktrees (isolated research per fund)', 'Skills (/write-memo template)', 'MCP (Attio)', 'WebSearch/WebFetch'],
    walkthrough: [
      'Create a /research-fund skill that takes a fund name as argument',
      'The skill spawns 3 agents in parallel using the Agent tool: data gatherer, performance analyst, diligence checker',
      'Each agent uses worktree isolation so they can write intermediate files without conflicts',
      'Data Gatherer queries Attio for existing records and call notes, then searches the web for recent news',
      'Performance Analyst runs Python scripts to calculate risk/return metrics from available data',
      'Diligence Checker reviews operational details and flags concerns',
      'All three return results to the orchestrator, which passes everything to the Memo Writer',
      'Memo Writer uses a /write-memo skill template to generate a standardized investment memo',
      'Final memo is saved and you review it before it goes anywhere',
    ],
  },
  {
    id: 'investor-comms',
    title: 'Investor Communications Hub',
    description: 'Automate LP reporting: generate one-pagers, draft newsletters, track who received what.',
    difficulty: 'starter',
    businessFunction: 'Investor Relations',
    problem: 'You manually update one-pagers in PowerPoint, draft newsletters in Google Docs, and track distribution via spreadsheets. Each quarter this takes a full week.',
    agents: [
      {
        id: 'data-puller',
        title: 'Data Puller',
        description: 'Pulls latest fund performance data from Notion and formats it for templates.',
        tools: ['Notion MCP', 'Read'],
        mcpServers: ['Notion'],
      },
      {
        id: 'doc-generator',
        title: 'Document Generator',
        description: 'Fills one-pager templates with latest data. Generates PDF output.',
        tools: ['Read', 'Write', 'Bash (Python/openpyxl/reportlab)'],
        skills: ['/generate-one-pager'],
      },
      {
        id: 'newsletter-drafter',
        title: 'Newsletter Drafter',
        description: 'Drafts market commentary based on recent data, portfolio positioning, and market events.',
        tools: ['WebSearch', 'Write'],
        skills: ['/draft-newsletter'],
      },
    ],
    orchestration: 'Pipeline. Data Puller runs first, then Document Generator and Newsletter Drafter run in parallel since they both consume the same data but produce different outputs.',
    claudeCodeCommands: ['Skills (/generate-one-pager, /draft-newsletter)', 'MCP (Notion)', 'Agent tool (parallel doc gen)', 'CronCreate (quarterly schedule)'],
    walkthrough: [
      'Create a /pull-fund-data skill that reads the latest performance data from your Notion database',
      'Create a /generate-one-pager skill with a template that accepts fund data and produces a formatted one-pager',
      'Create a /draft-newsletter skill that takes market data + portfolio data and drafts commentary',
      'Build a /quarterly-report orchestrator skill that runs data pull, then spawns doc generator and newsletter drafter in parallel',
      'Set up a CronCreate reminder at quarter-end to trigger the workflow',
    ],
  },
  {
    id: 'daily-briefing',
    title: 'Morning Briefing Agent',
    description: 'Wake up to a daily briefing: overnight emails summarized, calendar prep, priority actions, market moves.',
    difficulty: 'starter',
    businessFunction: 'Operations',
    problem: 'Every morning you spend 30-45 minutes reading emails, checking your calendar, and figuring out what to focus on. You want this done for you before you sit down.',
    agents: [
      {
        id: 'email-summarizer',
        title: 'Email Summarizer',
        description: 'Scans overnight emails, categorizes by urgency, summarizes key messages.',
        tools: ['Gmail MCP'],
        mcpServers: ['Gmail'],
      },
      {
        id: 'priority-ranker',
        title: 'Priority Ranker',
        description: 'Takes email summaries + Attio tasks and ranks today\'s priorities.',
        tools: ['Attio MCP', 'Read'],
        mcpServers: ['Attio'],
      },
      {
        id: 'briefing-compiler',
        title: 'Briefing Compiler',
        description: 'Combines all inputs into a clean daily briefing document.',
        tools: ['Write'],
      },
    ],
    orchestration: 'Pipeline with fan-out. Email Summarizer and Attio data pull run in parallel. Priority Ranker consumes both. Briefing Compiler produces the final output.',
    claudeCodeCommands: ['CronCreate (8am daily)', 'Agent tool (parallel data fetching)', 'MCP (Gmail, Attio)', 'Skills (/morning-briefing)', 'Memory (track what was briefed yesterday)'],
    walkthrough: [
      'Create a /morning-briefing skill',
      'Skill spawns two agents in parallel: one scans Gmail for overnight emails, one pulls open tasks from Attio',
      'Both return structured summaries to the main skill',
      'Priority Ranker evaluates urgency and produces a ranked action list',
      'Compiler formats everything into a clean briefing saved to ~/briefings/YYYY-MM-DD.md',
      'Set up launchd or CronCreate to run this at 8am — ready when you open your laptop',
    ],
  },
  {
    id: 'pr-review-system',
    title: 'Automated Code Review',
    description: 'Claude Code reviews every PR automatically, posts comments, and approves clean code.',
    difficulty: 'intermediate',
    businessFunction: 'AI Initiatives',
    problem: 'You\'re the only technical person reviewing code across multiple repos. PRs pile up and slow down development.',
    agents: [
      {
        id: 'pr-watcher',
        title: 'PR Watcher',
        description: 'Monitors repos for new PRs. Triggers review when one is opened or updated.',
        tools: ['Bash (gh CLI)'],
        triggers: ['GitHub Action on PR event'],
      },
      {
        id: 'code-reviewer',
        title: 'Code Reviewer',
        description: 'Reads the diff, checks for bugs, security issues, style violations, and architectural concerns.',
        tools: ['Read', 'Grep', 'Bash (gh CLI)'],
        skills: ['/review-pr'],
      },
      {
        id: 'comment-poster',
        title: 'Comment Poster',
        description: 'Posts inline review comments on specific lines and a summary comment on the PR.',
        tools: ['Bash (gh CLI)'],
      },
    ],
    orchestration: 'Event-driven pipeline. GitHub Action triggers Claude Code in headless mode. Code Reviewer analyzes the diff. If issues found, Comment Poster adds review comments. If clean, auto-approves.',
    claudeCodeCommands: ['Headless mode (CI/CD)', 'Skills (/review-pr)', 'Bash (gh CLI)', 'CLAUDE.md (review criteria)', 'Hooks (auto-format check)'],
    walkthrough: [
      'Create a /review-pr skill with your team\'s review criteria in SKILL.md',
      'Set up a GitHub Action that triggers on PR events',
      'The action runs Claude Code in headless mode with the /review-pr skill',
      'Claude reads the diff using gh pr diff, analyzes changes, and checks against criteria',
      'Posts inline comments on specific lines using gh api',
      'Adds a summary review comment with approve/request-changes',
      'Configure allowlisted tools in headless mode so it can only read code and post comments (not push changes)',
    ],
  },
]
