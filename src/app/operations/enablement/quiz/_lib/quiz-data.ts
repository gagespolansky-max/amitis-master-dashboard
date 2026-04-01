export interface QuizQuestion {
  id: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export const aiSystemsQuestions: QuizQuestion[] = [
  {
    id: 'ai-1',
    topic: 'LLM Fundamentals',
    difficulty: 'easy',
    question: 'You\'re building a system that generates one-paragraph summaries of earnings calls. Analysts complain the summaries sometimes include plausible-sounding metrics that weren\'t in the original transcript. What\'s the most effective fix?',
    options: [
      'Increase the context window to fit the full transcript',
      'Lower temperature to near 0 and add explicit instructions to only reference information present in the input',
      'Fine-tune the model on your firm\'s earnings call data',
      'Switch to a larger model with better reasoning',
    ],
    correctIndex: 1,
    explanation: 'Low temperature reduces creative token sampling, making the model stick closer to input data. Combined with explicit "only reference provided information" instructions, this dramatically reduces hallucination. Larger models can still hallucinate — this is a prompting and parameter problem, not a model capability problem. Fine-tuning is expensive and doesn\'t solve hallucination directly.',
  },
  {
    id: 'ai-2',
    topic: 'Prompt Engineering',
    difficulty: 'easy',
    question: 'You need an LLM to classify investor emails into: "capital call", "redemption request", "general inquiry", or "document request". The model handles clear cases fine but misclassifies ambiguous emails. What\'s the most robust improvement?',
    options: [
      'Add a "confidence score" output and route low-confidence to human review',
      'Increase temperature to explore more classification possibilities',
      'Use few-shot examples showing tricky/ambiguous cases with the correct classification and reasoning',
      'Fine-tune on your entire email history',
    ],
    correctIndex: 2,
    explanation: 'Few-shot examples with tricky edge cases teach the model your specific classification boundaries — which matters most for ambiguous inputs. Showing reasoning alongside the classification ("this mentions timing but not amounts, so it\'s a general inquiry, not a capital call") gives the model decision criteria. Confidence scores add complexity without fixing the core issue. Temperature increase adds noise.',
  },
  {
    id: 'ai-3',
    topic: 'Agentic Patterns',
    difficulty: 'easy',
    question: 'You built an AI agent that researches companies by searching the web, reading financial filings, and writing reports. It often goes down rabbit holes — spending 20+ tool calls on tangential research. What architectural change fixes this?',
    options: [
      'Add a token budget that kills the agent after N tokens',
      'Use a plan-then-execute pattern: have the agent create a research plan first, get approval, then execute each step with a focused scope',
      'Remove web search and limit it to only financial filings',
      'Add a system prompt saying "be concise"',
    ],
    correctIndex: 1,
    explanation: 'Plan-then-execute separates strategic thinking from tactical execution. The planning step forces the agent to scope the work upfront, and execution stays within that scope. This is fundamentally better than token limits (which cut off mid-work) or removing capabilities (which limits usefulness). System prompt instructions are too vague to constrain agentic behavior reliably.',
  },
  {
    id: 'ai-4',
    topic: 'RAG & Knowledge Systems',
    difficulty: 'medium',
    question: 'Your RAG system answers questions about legal agreements. Lawyers report that it sometimes gives answers combining information from two DIFFERENT contracts, creating responses that sound right but are factually wrong. What\'s the most likely cause and fix?',
    options: [
      'The embedding model isn\'t large enough — upgrade to a bigger one',
      'Chunks from different documents are being retrieved and mixed without source tracking. Add document-level metadata to chunks and filter retrieval to a single document per query.',
      'The LLM is hallucinating — lower the temperature',
      'Your chunk overlap is too high, causing duplicate information',
    ],
    correctIndex: 1,
    explanation: 'When a RAG system pulls chunks from multiple source documents, the LLM can synthesize conflicting information into a plausible-sounding but incorrect answer. The fix is metadata-aware retrieval: tag every chunk with its source document, filter to a single document when the question references a specific contract, or clearly separate sources in the prompt. This is a retrieval architecture problem, not a model problem.',
  },
  {
    id: 'ai-5',
    topic: 'Orchestration & Production',
    difficulty: 'medium',
    question: 'You have three AI features in production: (1) a ticket classifier running 10K times/day, (2) a research report generator used 20 times/day, (3) a real-time chat assistant. All three use Claude Opus. Your monthly API bill is $4K. How do you cut costs by 60%+ without noticeable quality loss?',
    options: [
      'Cache all responses and serve from cache when possible',
      'Route by task complexity: use Haiku for classification, Sonnet for chat, keep Opus only for research reports. Most cost comes from high-volume simple tasks on expensive models.',
      'Batch all requests to get volume discounts',
      'Reduce the context window size on all requests',
    ],
    correctIndex: 1,
    explanation: 'Model routing is the highest-leverage cost optimization. Classification (simple, high-volume) works nearly as well on Haiku at ~1/50th the cost of Opus — this alone could cut 80% of your bill since it\'s 10K requests/day. Chat needs balanced quality/speed (Sonnet). Only research reports need frontier reasoning (Opus). This principle — match model capability to task complexity — is how production AI systems stay affordable.',
  },
  {
    id: 'ai-6',
    topic: 'AI Strategy & Architecture',
    difficulty: 'medium',
    question: 'Your CIO wants to build an AI system that reads all incoming trade confirmations, extracts key fields, and auto-reconciles with your portfolio management system. Currently, a junior analyst does this manually for 2 hours/day. What\'s the right approach?',
    options: [
      'Build a fully autonomous system that replaces the analyst entirely from day one',
      'Start with AI-assisted extraction with human review — the analyst reviews AI output instead of doing manual entry. Measure accuracy over weeks, then gradually reduce oversight as confidence builds.',
      'Use a rule-based system instead — AI is overkill for structured document extraction',
      'Wait for a vendor solution rather than building in-house',
    ],
    correctIndex: 1,
    explanation: 'Human-in-the-loop is the right starting pattern for high-stakes financial operations. The analyst goes from 2 hours of manual work to 20 minutes of review, getting immediate value. You build confidence in accuracy over time and can quantify error rates before removing oversight. Going fully autonomous on day one is risky for financial data. Rule-based systems fail on format variations across counterparties.',
  },
  {
    id: 'ai-7',
    topic: 'Eval & Testing',
    difficulty: 'hard',
    question: 'You built a RAG system for fund due diligence that answers questions about portfolio companies. It\'s been in production for 3 months. A PM reports that answers about a company that was recently restructured are outdated. You fix the data, but realize you have no way to catch this proactively. What do you build?',
    options: [
      'A cron job that re-indexes all documents weekly',
      'An eval pipeline: a set of ground-truth Q&A pairs that you run weekly, measuring both retrieval recall (did it find the right chunks?) and answer accuracy (did it give the right answer?). Alert on regressions.',
      'A feedback button so users can flag bad answers',
      'Automatic document expiry — delete chunks older than 30 days',
    ],
    correctIndex: 1,
    explanation: 'An eval pipeline with ground-truth test cases is how production AI systems catch regressions proactively. You create Q&A pairs for critical scenarios (including recently-changed data), run them on a schedule, and alert when scores drop. This catches staleness, retrieval failures, AND model quality changes. User feedback is reactive (damage already done). Re-indexing helps freshness but doesn\'t verify correctness. Automatic expiry loses historical context.',
  },
  {
    id: 'ai-8',
    topic: 'Multi-Agent Systems',
    difficulty: 'hard',
    question: 'You\'re designing a system where one agent monitors news feeds, another analyzes sentiment, a third checks portfolio exposure, and a coordinator decides whether to alert the PM. During testing, the coordinator sometimes misinterprets the sentiment agent\'s output and sends false alerts. What\'s the best fix?',
    options: [
      'Add retry logic so the coordinator re-analyzes when uncertain',
      'Define a strict typed schema for inter-agent communication — each agent outputs structured data (not free text) with confidence scores, and the coordinator applies explicit rules, not LLM judgment, for alert thresholds',
      'Replace the multi-agent system with a single model that does everything',
      'Add a human approval step before every alert',
    ],
    correctIndex: 1,
    explanation: 'Structured inter-agent communication prevents the "telephone game" problem where one agent\'s nuanced output gets misread by another. When the sentiment agent outputs { sentiment: -0.8, confidence: 0.9, topics: ["earnings miss"] } instead of free text, the coordinator can apply deterministic rules. This is a core multi-agent architecture principle: use structured data contracts between agents, and reserve LLM judgment for tasks that actually need it.',
  },
]

export const claudeCodeQuestions: QuizQuestion[] = [
  {
    id: 'cc-1',
    topic: 'Core Usage',
    difficulty: 'easy',
    question: 'You want Claude Code to add error handling to a Python script at src/pipeline.py. You know exactly which function needs it. What\'s the most efficient prompt?',
    options: [
      '"Can you help me with error handling?"',
      '"Read src/pipeline.py and add try/except blocks to the process_data function — it should catch API timeouts and retry up to 3 times with exponential backoff"',
      'Copy-paste the entire file into the chat and say "add error handling"',
      '"Find all Python files and add error handling everywhere"',
    ],
    correctIndex: 1,
    explanation: 'Specific prompts with file paths, function names, and exact requirements let Claude Code work efficiently — it reads just what it needs and knows exactly what to build. Vague prompts ("help with error handling") waste time clarifying. Copy-pasting loses file context. Broad requests ("everywhere") are unfocused and risky.',
  },
  {
    id: 'cc-2',
    topic: 'Configuration',
    difficulty: 'easy',
    question: 'You just joined a new team with a large Python codebase. You want Claude Code to automatically follow the team\'s conventions (pytest over unittest, type hints required, Google-style docstrings). Where should this go?',
    options: [
      'Tell Claude at the start of every session',
      'Put it in CLAUDE.md at the project root — it\'s loaded automatically and the whole team shares it',
      'Add it to your personal ~/.zshrc',
      'Create a .claude-config.yaml file',
    ],
    correctIndex: 1,
    explanation: 'Project-level CLAUDE.md is loaded into every Claude Code session in that directory. It\'s version-controlled so the whole team benefits. This is the right place for project-specific conventions — it survives across sessions and team members. Personal configs (~/.claude/) are for cross-project preferences, not team conventions.',
  },
  {
    id: 'cc-3',
    topic: 'Workflow Patterns',
    difficulty: 'easy',
    question: 'You ask Claude Code to refactor a 200-line function into smaller pieces. After the refactor, 3 tests fail. What\'s the best approach?',
    options: [
      'Undo everything with git checkout and try a different approach',
      'Paste the test errors into Claude Code — it can read the failing tests, understand what broke, and fix the refactor while keeping the improved structure',
      'Fix the tests manually since Claude Code already made its changes',
      'Start a completely new session',
    ],
    correctIndex: 1,
    explanation: 'Claude Code is iterative. Sharing test failures gives it concrete signals about what broke. It can read the test expectations, compare with its refactored code, and fix the issue — often better than the first attempt because it now understands both the code AND the test contracts. Throwing away the refactor loses good work. Manual fixes miss the efficiency of letting Claude iterate.',
  },
  {
    id: 'cc-4',
    topic: 'MCP',
    difficulty: 'medium',
    question: 'You want Claude Code to pull data from your team\'s Notion workspace and your PostgreSQL database during conversations. What enables this?',
    options: [
      'Claude Code has built-in database and Notion access',
      'Install MCP servers for Notion and PostgreSQL — they extend Claude Code with native access to external tools through a standardized protocol',
      'Write wrapper scripts and tell Claude Code to run them',
      'Export data from both systems into local files first',
    ],
    correctIndex: 1,
    explanation: 'MCP (Model Context Protocol) servers give Claude Code native, seamless access to external systems. Instead of clunky script wrappers, MCP servers expose database queries and Notion operations as first-class tools Claude Code can call naturally during conversation. This is the standard extensibility mechanism — it\'s how you connect Claude Code to your specific infrastructure.',
  },
  {
    id: 'cc-5',
    topic: 'Permission Model',
    difficulty: 'medium',
    question: 'You\'re setting up Claude Code to run in GitHub Actions for automated PR reviews. The action runs but immediately fails because Claude Code prompts for permission to read files. What\'s the correct setup?',
    options: [
      'Use --yes to auto-approve all actions',
      'Configure headless mode with an explicit allowlist of tools (Read, Grep, Glob) — this grants specific permissions without blanket approval',
      'Run the action as root user',
      'Disable Claude Code\'s security model via environment variable',
    ],
    correctIndex: 1,
    explanation: 'Headless mode with tool allowlists is the secure CI/CD pattern. You explicitly grant only the tools needed (Read, Grep for PR review — NOT Edit or Bash) so Claude Code can operate autonomously within safe boundaries. --yes auto-approves everything including destructive operations — a security risk in CI. There\'s no way to "disable" the security model, and root doesn\'t help.',
  },
  {
    id: 'cc-6',
    topic: 'Advanced Techniques',
    difficulty: 'medium',
    question: 'You inherited a complex monorepo with 500+ files. Before starting any work, you want Claude Code to understand the architecture, dependencies, and coding patterns. What\'s the most efficient bootstrapping approach?',
    options: [
      'Manually read through the codebase and write a summary',
      'Run /init — it explores the codebase, identifies patterns, and generates a CLAUDE.md capturing project context for all future sessions',
      'Ask Claude Code to read every file one by one',
      'Point Claude Code at the README and hope it\'s up to date',
    ],
    correctIndex: 1,
    explanation: '/init tells Claude Code to systematically explore the codebase — reading key files, understanding directory structure, identifying patterns and frameworks, and distilling it all into a CLAUDE.md. This bootstraps every future session with project awareness. Reading every file wastes context window. READMEs are often stale. Manual summaries miss things.',
  },
  {
    id: 'cc-7',
    topic: 'Troubleshooting',
    difficulty: 'hard',
    question: 'You\'ve been working with Claude Code on a complex migration for 45 minutes. It\'s made 15+ file edits. Now when you ask it to modify a file it changed earlier, it seems to have forgotten what it did and re-reads the file. Responses are getting less focused. What\'s happening and what should you do?',
    options: [
      'Claude Code has a bug — restart your terminal',
      'The context window is filling up. Commit your current changes, start a fresh session, and reference the committed state. Keep future sessions scoped to specific subtasks.',
      'Your internet connection is unstable',
      'The files are too large for Claude Code',
    ],
    correctIndex: 1,
    explanation: 'Long sessions with many tool calls fill the context window. As it fills, the system compresses earlier messages, losing detail about previous edits. The solution: commit progress as checkpoints, start fresh sessions for the next chunk of work. The new session reads the current file state (which includes your changes) and works with full context. This is a fundamental LLM constraint — the fix is workflow discipline, not technology.',
  },
  {
    id: 'cc-8',
    topic: 'Custom Skills & Automation',
    difficulty: 'hard',
    question: 'You want to create a reusable Claude Code command that reviews your team\'s PRs with specific criteria: checks for test coverage, validates error handling patterns, and ensures API contracts match the OpenAPI spec. What\'s the right way to build this?',
    options: [
      'Write a bash script that calls Claude Code with a long prompt',
      'Create a custom skill (SKILL.md) that defines the review criteria, context needed, and agent configuration — invoke it with /review-pr and it runs consistently every time',
      'Create a GitHub Action that runs a different linting tool',
      'Add the review criteria to your personal CLAUDE.md',
    ],
    correctIndex: 1,
    explanation: 'Custom skills (SKILL.md files) package repeatable workflows: the prompt, context requirements, agent type, and whether it\'s user-invocable. /review-pr becomes a one-command operation that runs the same thorough review every time. Bash scripts lose Claude Code\'s interactive capabilities. CLAUDE.md is for project context, not repeatable commands. A separate linter can\'t check semantic patterns like API contract compliance.',
  },
]
