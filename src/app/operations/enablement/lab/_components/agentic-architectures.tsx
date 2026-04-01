'use client'

import { useState } from 'react'

interface AgentNode {
  id: string
  label: string
  role: string
  type: 'orchestrator' | 'specialist' | 'tool' | 'data' | 'human'
  x: number
  y: number
}

interface Connection {
  from: string
  to: string
  label: string
  type: 'delegates' | 'queries' | 'writes' | 'reads' | 'reviews' | 'returns'
}

interface Architecture {
  id: string
  title: string
  subtitle: string
  description: string
  agents: AgentNode[]
  connections: Connection[]
  toolStack: { name: string; purpose: string; category: string }[]
  thinkingPrompt: string
  explanation: string
}

const connectionColors: Record<string, string> = {
  delegates: '#6366f1',
  queries: '#22c55e',
  writes: '#f59e0b',
  reads: '#3b82f6',
  reviews: '#a855f7',
  returns: '#6b7280',
}

const nodeColors: Record<string, { bg: string; border: string; text: string }> = {
  orchestrator: { bg: '#6366f1', border: '#818cf8', text: '#fff' },
  specialist: { bg: '#1a1d2b', border: '#6366f1', text: '#e5e7eb' },
  tool: { bg: '#1a1d2b', border: '#22c55e', text: '#22c55e' },
  data: { bg: '#1a1d2b', border: '#f59e0b', text: '#f59e0b' },
  human: { bg: '#1a1d2b', border: '#a855f7', text: '#a855f7' },
}

const architectures: Architecture[] = [
  {
    id: 'ai-company-6',
    title: 'The 6-Person AI Company',
    subtitle: 'How agents map to business functions',
    description: 'Imagine a 6-person company where every employee is an AI agent. Each has a specialization, tools they use, and data sources they connect to. The CEO (orchestrator) delegates work, specialists execute, and they all share infrastructure.',
    agents: [
      { id: 'ceo', label: 'CEO Agent', role: 'Orchestrator — routes tasks, makes decisions, synthesizes results', type: 'orchestrator', x: 350, y: 40 },
      { id: 'researcher', label: 'Research Analyst', role: 'Fund vetting, market research, competitive analysis', type: 'specialist', x: 100, y: 160 },
      { id: 'ops', label: 'Operations Lead', role: 'Accounting, reporting, data processing', type: 'specialist', x: 350, y: 160 },
      { id: 'comms', label: 'Comms Manager', role: 'Investor updates, one-pagers, newsletters', type: 'specialist', x: 600, y: 160 },
      { id: 'engineer', label: 'AI Engineer', role: 'Builds tools, maintains pipelines, monitors systems', type: 'specialist', x: 100, y: 310 },
      { id: 'analyst', label: 'Data Analyst', role: 'Performance tracking, NAV calculations, portfolio analytics', type: 'specialist', x: 600, y: 310 },
      { id: 'vectordb', label: 'Pinecone', role: 'Vector database for semantic search over docs, memos, calls', type: 'tool', x: 100, y: 440 },
      { id: 'notion', label: 'Notion', role: 'Structured data — fund records, tasks, databases', type: 'data', x: 270, y: 440 },
      { id: 'gmail', label: 'Gmail', role: 'Email scanning, fund returns, LP communications', type: 'data', x: 430, y: 440 },
      { id: 'attio', label: 'Attio CRM', role: 'Contacts, deal pipeline, call transcripts', type: 'data', x: 600, y: 440 },
      { id: 'you', label: 'You (Human)', role: 'Review, approve, override, provide judgment', type: 'human', x: 350, y: 550 },
    ],
    connections: [
      { from: 'ceo', to: 'researcher', label: 'Research this fund', type: 'delegates' },
      { from: 'ceo', to: 'ops', label: 'Process returns', type: 'delegates' },
      { from: 'ceo', to: 'comms', label: 'Draft update', type: 'delegates' },
      { from: 'researcher', to: 'vectordb', label: 'Search memos', type: 'queries' },
      { from: 'researcher', to: 'attio', label: 'Pull call notes', type: 'reads' },
      { from: 'ops', to: 'gmail', label: 'Scan for statements', type: 'reads' },
      { from: 'ops', to: 'notion', label: 'Update fund data', type: 'writes' },
      { from: 'comms', to: 'notion', label: 'Pull latest numbers', type: 'reads' },
      { from: 'comms', to: 'gmail', label: 'Send updates', type: 'writes' },
      { from: 'analyst', to: 'notion', label: 'Read fund records', type: 'reads' },
      { from: 'analyst', to: 'vectordb', label: 'Store embeddings', type: 'writes' },
      { from: 'engineer', to: 'vectordb', label: 'Manage indexes', type: 'writes' },
      { from: 'ceo', to: 'you', label: 'Request approval', type: 'reviews' },
      { from: 'researcher', to: 'ceo', label: 'Research memo', type: 'returns' },
      { from: 'ops', to: 'ceo', label: 'Returns processed', type: 'returns' },
    ],
    toolStack: [
      { name: 'Pinecone', purpose: 'Store and search vector embeddings of documents, call transcripts, and research memos. Enables semantic search — "find memos about emerging market debt" instead of keyword matching.', category: 'Vector DB' },
      { name: 'Notion (via MCP)', purpose: 'Structured data store for fund records, tasks, and databases. Agents read/write fund performance data, track tasks, and maintain the knowledge base.', category: 'Database' },
      { name: 'Gmail (via MCP)', purpose: 'Email interface for scanning fund return statements, extracting PDFs, and sending investor communications.', category: 'Communication' },
      { name: 'Attio (via MCP)', purpose: 'CRM for managing fund relationships, deal pipeline, and accessing call transcripts and meeting notes.', category: 'CRM' },
      { name: 'Claude API', purpose: 'The brain powering each agent. Different agents can use different models — Haiku for simple classification, Sonnet for analysis, Opus for complex reasoning.', category: 'LLM' },
      { name: 'LangChain / LlamaIndex', purpose: 'Orchestration frameworks that chain LLM calls, manage retrieval pipelines, and handle tool routing. Optional — you can also orchestrate directly with Claude Code skills.', category: 'Framework' },
    ],
    thinkingPrompt: 'If you were building this system, where would you start? Most people try to build the CEO agent first — but that\'s backwards. Start with one specialist agent that solves a real problem you have TODAY. Get it working end-to-end. Then add a second one. The orchestrator pattern emerges naturally once you have 3+ specialists that need coordination.',
    explanation: 'This architecture mirrors how a real company works: a coordinator (CEO) delegates to specialists who each own a domain. The key insight is that agents don\'t talk to each other directly — they communicate through the orchestrator and through shared data stores. The orchestrator decides WHO does WHAT, specialists decide HOW. Tools like Pinecone and Notion are shared infrastructure that multiple agents read from and write to.',
  },
  {
    id: 'rag-pipeline',
    title: 'RAG Pipeline Architecture',
    subtitle: 'How retrieval-augmented generation actually works',
    description: 'RAG is the most common pattern for giving LLMs access to your private data. Here\'s how the pieces connect — from user query to grounded answer.',
    agents: [
      { id: 'user-query', label: 'User Query', role: '"What was Fund X\'s Q3 performance vs benchmark?"', type: 'human', x: 350, y: 40 },
      { id: 'router', label: 'Query Router', role: 'Determines if query needs retrieval, direct answer, or tool use', type: 'orchestrator', x: 350, y: 140 },
      { id: 'embedder', label: 'Embedding Model', role: 'Converts query text into a vector (array of numbers)', type: 'specialist', x: 130, y: 250 },
      { id: 'retriever', label: 'Retriever', role: 'Searches vector DB for similar chunks, applies reranking', type: 'specialist', x: 350, y: 250 },
      { id: 'reranker', label: 'Reranker', role: 'Scores retrieved chunks by relevance, filters noise', type: 'specialist', x: 570, y: 250 },
      { id: 'vectordb', label: 'Pinecone / Chroma', role: 'Stores document chunks as vectors with metadata', type: 'tool', x: 130, y: 370 },
      { id: 'generator', label: 'Generator (LLM)', role: 'Reads retrieved context + query, generates grounded answer', type: 'specialist', x: 350, y: 370 },
      { id: 'docs', label: 'Document Store', role: 'Original PDFs, memos, transcripts — chunked and embedded', type: 'data', x: 570, y: 370 },
      { id: 'answer', label: 'Grounded Answer', role: 'Answer with citations pointing back to source documents', type: 'human', x: 350, y: 480 },
    ],
    connections: [
      { from: 'user-query', to: 'router', label: 'Natural language query', type: 'delegates' },
      { from: 'router', to: 'embedder', label: 'Embed query', type: 'delegates' },
      { from: 'embedder', to: 'retriever', label: 'Query vector', type: 'returns' },
      { from: 'retriever', to: 'vectordb', label: 'Similarity search', type: 'queries' },
      { from: 'vectordb', to: 'retriever', label: 'Top-K chunks', type: 'returns' },
      { from: 'retriever', to: 'reranker', label: 'Candidate chunks', type: 'delegates' },
      { from: 'reranker', to: 'generator', label: 'Best chunks', type: 'returns' },
      { from: 'docs', to: 'vectordb', label: 'Pre-indexed chunks', type: 'writes' },
      { from: 'generator', to: 'answer', label: 'Cited response', type: 'returns' },
    ],
    toolStack: [
      { name: 'Embedding Model', purpose: 'Converts text into vectors (dense numerical representations). Models like OpenAI ada-002 or Cohere embed-v3 turn "fund performance" into [0.12, -0.34, ...]. Similar concepts end up near each other in vector space.', category: 'AI Model' },
      { name: 'Vector Database', purpose: 'Stores and searches vectors efficiently. When you query, it finds the K most similar vectors (chunks) using cosine similarity or dot product. Pinecone, Chroma, Weaviate, and Qdrant are popular choices.', category: 'Database' },
      { name: 'Chunking Strategy', purpose: 'How you split documents matters hugely. Too large = key details get buried. Too small = context is lost. Common: 500-1000 tokens with 100-token overlap. Semantic chunking (by paragraph/section) often beats fixed-size.', category: 'Data Processing' },
      { name: 'Reranker', purpose: 'After retrieval, a reranker (like Cohere rerank or a cross-encoder) re-scores chunks by actual relevance to the query. This catches cases where vector similarity returns topically related but not actually useful chunks.', category: 'AI Model' },
    ],
    thinkingPrompt: 'The most common RAG failure isn\'t the LLM — it\'s retrieval. If you put garbage chunks in front of the model, you get garbage answers with confident citations. Before optimizing your prompt or switching models, check: are the RIGHT chunks being retrieved? Try your query and manually inspect what comes back.',
    explanation: 'RAG solves the "LLM doesn\'t know about my private data" problem without fine-tuning. The pipeline: (1) chunk your documents, (2) embed them into vectors, (3) store in a vector DB, (4) at query time, embed the question, (5) find similar chunks, (6) rerank for relevance, (7) pass the best chunks + question to the LLM, (8) LLM generates an answer grounded in your actual data. The key trade-off is chunk size: smaller chunks = more precise retrieval but less context per chunk.',
  },
  {
    id: 'multi-agent-workflow',
    title: 'Multi-Agent Task Execution',
    subtitle: 'How agents coordinate on complex tasks',
    description: 'When a task requires multiple capabilities — research, analysis, writing, approval — a single agent can\'t do it all well. Here\'s how you decompose work across specialized agents.',
    agents: [
      { id: 'trigger', label: 'Trigger', role: 'User request, scheduled cron, webhook, or email arrival', type: 'human', x: 350, y: 40 },
      { id: 'planner', label: 'Planner Agent', role: 'Decomposes task into steps, assigns to specialists, manages dependencies', type: 'orchestrator', x: 350, y: 140 },
      { id: 'agent-a', label: 'Agent A: Gather', role: 'Collects data from APIs, databases, web. Fan-out pattern.', type: 'specialist', x: 100, y: 260 },
      { id: 'agent-b', label: 'Agent B: Analyze', role: 'Processes gathered data, runs calculations, finds patterns', type: 'specialist', x: 350, y: 260 },
      { id: 'agent-c', label: 'Agent C: Generate', role: 'Produces output — reports, emails, documents, code', type: 'specialist', x: 600, y: 260 },
      { id: 'validator', label: 'Validator Agent', role: 'Checks output quality, catches errors, enforces standards', type: 'specialist', x: 350, y: 380 },
      { id: 'memory', label: 'Shared Memory', role: 'JSON files, database, or vector store that all agents read/write', type: 'data', x: 100, y: 380 },
      { id: 'tools', label: 'Tool Registry', role: 'MCP servers, APIs, file system — shared across all agents', type: 'tool', x: 600, y: 380 },
      { id: 'output', label: 'Final Output', role: 'Validated deliverable ready for human review', type: 'human', x: 350, y: 490 },
    ],
    connections: [
      { from: 'trigger', to: 'planner', label: 'Task request', type: 'delegates' },
      { from: 'planner', to: 'agent-a', label: 'Step 1: Gather', type: 'delegates' },
      { from: 'planner', to: 'agent-b', label: 'Step 2: Analyze', type: 'delegates' },
      { from: 'planner', to: 'agent-c', label: 'Step 3: Generate', type: 'delegates' },
      { from: 'agent-a', to: 'memory', label: 'Store findings', type: 'writes' },
      { from: 'agent-b', to: 'memory', label: 'Read + write analysis', type: 'reads' },
      { from: 'agent-c', to: 'memory', label: 'Read context', type: 'reads' },
      { from: 'agent-a', to: 'tools', label: 'API calls', type: 'queries' },
      { from: 'agent-c', to: 'tools', label: 'Generate docs', type: 'queries' },
      { from: 'agent-c', to: 'validator', label: 'Draft output', type: 'returns' },
      { from: 'validator', to: 'planner', label: 'Pass/fail + feedback', type: 'returns' },
      { from: 'validator', to: 'output', label: 'Approved output', type: 'returns' },
    ],
    toolStack: [
      { name: 'Shared Memory', purpose: 'The critical glue. Agents can\'t talk to each other directly — they communicate through shared state. This can be JSON files on disk, a database, or a vector store. Each agent reads what it needs and writes what it produces.', category: 'Infrastructure' },
      { name: 'Tool Registry (MCP)', purpose: 'A centralized set of tools all agents can access. MCP servers give every agent the ability to read Gmail, write to Notion, query Attio, etc. without each agent needing its own integration.', category: 'Integration' },
      { name: 'Planner Pattern', purpose: 'The planner doesn\'t do the work — it decides WHAT work needs doing and WHO should do it. It manages the DAG (directed acyclic graph) of task dependencies. This is the hardest agent to build well.', category: 'Pattern' },
      { name: 'Validator Pattern', purpose: 'Never ship agent output without validation. A validator agent checks for quality, accuracy, formatting, and compliance before output reaches the user. Think of it as an automated code review for content.', category: 'Pattern' },
    ],
    thinkingPrompt: 'The biggest mistake in multi-agent systems is making agents too smart. Each agent should do ONE thing well. If an agent needs to gather data AND analyze it AND write a report, split it into three agents. Simple agents with clear boundaries are easier to debug, test, and improve than clever agents that try to do everything.',
    explanation: 'Multi-agent execution follows a lifecycle: Trigger → Plan → Execute (possibly in parallel) → Validate → Output. The planner is the brain, specialists are the hands, shared memory is how they coordinate, and the validator is quality control. In Claude Code, this maps to: Skills (define each agent\'s behavior), Agent tool (spawn specialists), shared JSON files (memory), and MCP servers (tools).',
  },
]

function DiagramView({ arch }: { arch: Architecture }) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredConn, setHoveredConn] = useState<number | null>(null)

  const svgWidth = 750
  const svgHeight = 600

  function getNodeCenter(node: AgentNode) {
    return { x: node.x + 60, y: node.y + 25 }
  }

  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-4 overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} className="min-w-[750px]">
        {/* Connections */}
        {arch.connections.map((conn, i) => {
          const fromNode = arch.agents.find((a) => a.id === conn.from)
          const toNode = arch.agents.find((a) => a.id === conn.to)
          if (!fromNode || !toNode) return null

          const from = getNodeCenter(fromNode)
          const to = getNodeCenter(toNode)
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2
          const isHovered = hoveredConn === i

          return (
            <g
              key={`conn-${i}`}
              onMouseEnter={() => setHoveredConn(i)}
              onMouseLeave={() => setHoveredConn(null)}
              style={{ cursor: 'pointer' }}
            >
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={connectionColors[conn.type]}
                strokeWidth={isHovered ? 2.5 : 1.5}
                strokeOpacity={isHovered ? 1 : 0.4}
                strokeDasharray={conn.type === 'returns' ? '4,4' : 'none'}
              />
              {isHovered && (
                <g>
                  <rect
                    x={midX - conn.label.length * 3.5 - 6}
                    y={midY - 10}
                    width={conn.label.length * 7 + 12}
                    height={20}
                    rx={4}
                    fill="#1a1d2b"
                    stroke={connectionColors[conn.type]}
                    strokeWidth={1}
                  />
                  <text
                    x={midX} y={midY + 4}
                    textAnchor="middle"
                    fill="#e5e7eb"
                    fontSize={10}
                    fontFamily="monospace"
                  >
                    {conn.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {arch.agents.map((agent) => {
          const colors = nodeColors[agent.type]
          const isHovered = hoveredNode === agent.id

          return (
            <g
              key={agent.id}
              onMouseEnter={() => setHoveredNode(agent.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={agent.x}
                y={agent.y}
                width={120}
                height={50}
                rx={8}
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth={isHovered ? 2 : 1}
                opacity={isHovered ? 1 : 0.9}
              />
              <text
                x={agent.x + 60}
                y={agent.y + 22}
                textAnchor="middle"
                fill={colors.text}
                fontSize={11}
                fontWeight={600}
              >
                {agent.label}
              </text>
              <text
                x={agent.x + 60}
                y={agent.y + 38}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={8}
              >
                {agent.type}
              </text>

              {isHovered && (
                <g>
                  <rect
                    x={agent.x - 20}
                    y={agent.y + 55}
                    width={160}
                    height={40}
                    rx={6}
                    fill="#1a1d2b"
                    stroke="#252937"
                    strokeWidth={1}
                  />
                  <foreignObject x={agent.x - 16} y={agent.y + 59} width={152} height={32}>
                    <div style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1.3, overflow: 'hidden' }}>
                      {agent.role}
                    </div>
                  </foreignObject>
                </g>
              )}
            </g>
          )
        })}

        {/* Legend */}
        <g transform={`translate(10, ${svgHeight - 30})`}>
          {Object.entries(connectionColors).map(([type, color], i) => (
            <g key={type} transform={`translate(${i * 100}, 0)`}>
              <line x1={0} y1={8} x2={20} y2={8} stroke={color} strokeWidth={2} strokeDasharray={type === 'returns' ? '4,4' : 'none'} />
              <text x={24} y={12} fill="#6b7280" fontSize={9}>{type}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

export default function AgenticArchitectures() {
  const [selectedArch, setSelectedArch] = useState<Architecture | null>(null)

  if (selectedArch) {
    return (
      <div>
        <button
          onClick={() => setSelectedArch(null)}
          className="text-xs text-muted hover:text-foreground transition-colors mb-4"
        >
          &larr; Back to architectures
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-medium">{selectedArch.title}</h2>
          <p className="text-xs text-muted mt-1">{selectedArch.subtitle}</p>
          <p className="text-sm text-muted mt-3">{selectedArch.description}</p>
        </div>

        {/* Interactive Diagram */}
        <DiagramView arch={selectedArch} />
        <p className="text-[10px] text-muted mt-2 mb-6">Hover over nodes and connections to see details.</p>

        {/* Tool Stack */}
        <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
          <h3 className="text-sm font-medium mb-4">Tool Stack Breakdown</h3>
          <div className="space-y-3">
            {selectedArch.toolStack.map((tool) => (
              <div key={tool.name} className="p-4 rounded-lg border border-card-border bg-background">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium">{tool.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">{tool.category}</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">{tool.purpose}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
          <h3 className="text-sm font-medium mb-2">How it all connects</h3>
          <p className="text-sm text-muted leading-relaxed">{selectedArch.explanation}</p>
        </div>

        {/* Thinking prompt */}
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-6">
          <h3 className="text-sm font-medium text-accent mb-2">Think about this</h3>
          <p className="text-sm text-muted leading-relaxed">{selectedArch.thinkingPrompt}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-muted mb-4">
        Interactive architecture diagrams showing how AI agents connect to each other, tools, and data sources. Hover to explore, click to dive deep.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {architectures.map((arch) => (
          <button
            key={arch.id}
            onClick={() => setSelectedArch(arch)}
            className="group rounded-xl border border-card-border bg-card-bg p-5 text-left transition-all hover:border-accent/30"
          >
            <h3 className="text-sm font-medium group-hover:text-accent transition-colors">{arch.title}</h3>
            <p className="text-xs text-accent mt-0.5">{arch.subtitle}</p>
            <p className="text-xs text-muted mt-2">{arch.description}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[10px] text-muted">{arch.agents.length} nodes</span>
              <span className="text-[10px] text-muted">&middot;</span>
              <span className="text-[10px] text-muted">{arch.connections.length} connections</span>
              <span className="text-[10px] text-muted">&middot;</span>
              <span className="text-[10px] text-muted">{arch.toolStack.length} tools explained</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
