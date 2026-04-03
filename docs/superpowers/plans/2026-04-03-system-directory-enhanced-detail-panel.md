# System Directory Enhanced Detail Panel + Context Tree — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Ask (AI Q&A), Usage stats, and Content Preview accordions to the system directory detail panel, plus a new Context Tree tab showing all CLAUDE.md files as an interactive tree.

**Architecture:** Enhances the existing system directory page with page-level tabs (Directory / Context Tree), three new API routes (ask, usage, content), one new API route for the context tree, and several new client components. All data is filesystem-read or Supabase-read — no new tables.

**Tech Stack:** Next.js 16.2.1, React 19, TypeScript, Tailwind CSS 4, Anthropic SDK (Sonnet), Supabase (read-only)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `api/ask/route.ts` | Create | POST — AI Q&A about selected entry |
| `api/usage/route.ts` | Create | GET — usage stats from skill_usage |
| `api/content/route.ts` | Create | GET — raw file content by path |
| `api/context-tree/route.ts` | Create | GET — CLAUDE.md tree structure |
| `_components/detail-accordion.tsx` | Create | Generic expandable accordion |
| `_components/ask-section.tsx` | Create | Ask input + answer display |
| `_components/usage-section.tsx` | Create | Usage stats + invocation table |
| `_components/content-preview.tsx` | Create | Raw markdown viewer |
| `_components/context-tree-view.tsx` | Create | Full Context Tree tab content |
| `_components/context-tree-node.tsx` | Create | Recursive tree node card |
| `_components/context-detail-panel.tsx` | Create | Side panel for selected CLAUDE.md |
| `page.tsx` | Modify | Add tab bar, conditionally render |
| `_components/detail-panel.tsx` | Modify | Add accordion sections below overview |
| `CLAUDE.md` | Create | Module documentation |

All paths relative to `src/app/skills/admin/system-directory/`.

---

### Task 1: Detail Accordion Component

**Files:**
- Create: `src/app/skills/admin/system-directory/_components/detail-accordion.tsx`

A generic reusable accordion wrapper used by Ask, Usage, and Content Preview.

- [ ] **Step 1: Create the accordion component**

Create `src/app/skills/admin/system-directory/_components/detail-accordion.tsx`:

```typescript
"use client"

import { useState } from "react"

interface DetailAccordionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function DetailAccordion({
  title,
  children,
  defaultOpen = false,
}: DetailAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-card-border">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between py-3 text-sm font-medium text-foreground hover:text-accent-hover transition-colors"
      >
        {title}
        <svg
          className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/skills/admin/system-directory/_components/detail-accordion.tsx
git commit -m "feat(skills): add generic accordion component for detail panel"
```

---

### Task 2: Content API Route

**Files:**
- Create: `src/app/skills/admin/system-directory/api/content/route.ts`

Returns raw file content for a given path. Validates the path is a `.md` file under `~/.claude/` or `~/<project>/.claude/`.

- [ ] **Step 1: Create the content API route**

```bash
mkdir -p src/app/skills/admin/system-directory/api/content
```

Create `src/app/skills/admin/system-directory/api/content/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import os from "os"
import path from "path"

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path")
  if (!filePath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 })
  }

  // Validate: must be .md, must be under ~/.claude/ or ~/<project>/.claude/
  const homeDir = os.homedir()
  const normalized = path.normalize(filePath)
  if (!normalized.endsWith(".md")) {
    return NextResponse.json({ error: "only .md files allowed" }, { status: 403 })
  }
  const globalClaude = path.join(homeDir, ".claude")
  const isGlobal = normalized.startsWith(globalClaude + path.sep) || normalized === path.join(homeDir, ".claude", "CLAUDE.md")
  const isProject = normalized.includes(path.sep + ".claude" + path.sep) && normalized.startsWith(homeDir + path.sep)
  if (!isGlobal && !isProject) {
    return NextResponse.json({ error: "path not allowed" }, { status: 403 })
  }

  try {
    const content = fs.readFileSync(normalized, "utf-8")
    return NextResponse.json({ content })
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 })
  }
}
```

- [ ] **Step 2: Test the content API**

```bash
curl -s "http://localhost:3000/skills/admin/system-directory/api/content?path=$(echo ~/.claude/skills/brainstorming/SKILL.md)" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['content'][:200])"
```

Expected: First 200 chars of the brainstorming SKILL.md file.

- [ ] **Step 3: Commit**

```bash
git add src/app/skills/admin/system-directory/api/content/route.ts
git commit -m "feat(skills): add content API route for on-demand file reads"
```

---

### Task 3: Content Preview Component

**Files:**
- Create: `src/app/skills/admin/system-directory/_components/content-preview.tsx`

- [ ] **Step 1: Create the content preview component**

Create `src/app/skills/admin/system-directory/_components/content-preview.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"

interface ContentPreviewProps {
  filePath: string
}

export default function ContentPreview({ filePath }: ContentPreviewProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setContent(null)
    setError(null)
    fetch(`/skills/admin/system-directory/api/content?path=${encodeURIComponent(filePath)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setContent(data.content)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [filePath])

  if (loading) {
    return <div className="text-xs text-muted py-2">Loading file content...</div>
  }
  if (error) {
    return <div className="text-xs text-red-400 py-2">Error: {error}</div>
  }

  return (
    <pre className="text-xs font-mono text-foreground/80 bg-background border border-card-border rounded-lg p-3 overflow-auto max-h-[400px] whitespace-pre-wrap break-words">
      {content}
    </pre>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/skills/admin/system-directory/_components/content-preview.tsx
git commit -m "feat(skills): add content preview component"
```

---

### Task 4: Usage API Route

**Files:**
- Create: `src/app/skills/admin/system-directory/api/usage/route.ts`

Queries `skill_usage` via the `skills` table to find usage for a given entry name.

- [ ] **Step 1: Create the usage API route**

```bash
mkdir -p src/app/skills/admin/system-directory/api/usage
```

Create `src/app/skills/admin/system-directory/api/usage/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  try {
    const supabase = createServerClient()

    // Find the skill ID from the skills table
    const { data: skillRow } = await supabase
      .from("skills")
      .select("id")
      .eq("name", name)
      .maybeSingle()

    if (!skillRow) {
      return NextResponse.json({
        totalUses: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: null,
        recentInvocations: [],
      })
    }

    // Get usage records
    const { data: usageRows } = await supabase
      .from("skill_usage")
      .select("id, triggered_at, outcome, duration_ms, context")
      .eq("skill_id", skillRow.id)
      .order("triggered_at", { ascending: false })
      .limit(10)

    const invocations = usageRows || []

    // Get counts
    const { count: totalUses } = await supabase
      .from("skill_usage")
      .select("*", { count: "exact", head: true })
      .eq("skill_id", skillRow.id)

    const { count: successCount } = await supabase
      .from("skill_usage")
      .select("*", { count: "exact", head: true })
      .eq("skill_id", skillRow.id)
      .eq("outcome", "success")

    const { count: failureCount } = await supabase
      .from("skill_usage")
      .select("*", { count: "exact", head: true })
      .eq("skill_id", skillRow.id)
      .eq("outcome", "failure")

    return NextResponse.json({
      totalUses: totalUses || 0,
      successCount: successCount || 0,
      failureCount: failureCount || 0,
      lastUsed: invocations.length > 0 ? invocations[0].triggered_at : null,
      recentInvocations: invocations.map((row) => ({
        id: row.id,
        timestamp: row.triggered_at,
        outcome: row.outcome,
        notes: row.context || "",
        project: "",
      })),
    })
  } catch {
    return NextResponse.json({
      totalUses: 0,
      successCount: 0,
      failureCount: 0,
      lastUsed: null,
      recentInvocations: [],
    })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/skills/admin/system-directory/api/usage/route.ts
git commit -m "feat(skills): add usage API route for skill_usage stats"
```

---

### Task 5: Usage Section Component

**Files:**
- Create: `src/app/skills/admin/system-directory/_components/usage-section.tsx`

- [ ] **Step 1: Create the usage section component**

Create `src/app/skills/admin/system-directory/_components/usage-section.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"

interface UsageData {
  totalUses: number
  successCount: number
  failureCount: number
  lastUsed: string | null
  recentInvocations: {
    id: string
    timestamp: string
    outcome: string
    notes: string
    project: string
  }[]
}

interface UsageSectionProps {
  entryName: string
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? "s" : ""} ago`
}

function successRateColor(rate: number): string {
  if (rate >= 80) return "text-success"
  if (rate >= 50) return "text-warning"
  return "text-red-400"
}

function outcomeBadge(outcome: string) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    success: { bg: "rgba(34,197,94,0.12)", text: "#22c55e", label: "✓" },
    partial: { bg: "rgba(234,179,8,0.12)", text: "#eab308", label: "⚠" },
    failure: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", label: "✗" },
  }
  const s = styles[outcome] || styles.partial
  return (
    <span
      style={{ background: s.bg, color: s.text }}
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
    >
      {s.label} {outcome}
    </span>
  )
}

export default function UsageSection({ entryName }: UsageSectionProps) {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/skills/admin/system-directory/api/usage?name=${encodeURIComponent(entryName)}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [entryName])

  if (loading) {
    return <div className="text-xs text-muted py-2">Loading usage data...</div>
  }

  if (!data || data.totalUses === 0) {
    return (
      <div className="text-xs text-muted py-2">
        Run <code className="bg-background px-1 py-0.5 rounded border border-card-border">/skill-analytics</code> after using this skill to start tracking
      </div>
    )
  }

  const successRate = data.totalUses > 0
    ? Math.round((data.successCount / data.totalUses) * 100)
    : 0

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">Total</div>
          <div className="text-lg font-semibold">{data.totalUses}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">Success rate</div>
          <div className={`text-lg font-semibold ${successRateColor(successRate)}`}>
            {successRate}%
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">Last used</div>
          <div className="text-sm">{data.lastUsed ? relativeDate(data.lastUsed) : "never"}</div>
        </div>
      </div>

      {/* Recent invocations */}
      {data.recentInvocations.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Recent</div>
          <div className="space-y-1.5">
            {data.recentInvocations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-2 text-xs py-1 border-b border-card-border last:border-0"
              >
                <span className="text-muted w-20 shrink-0">
                  {new Date(inv.timestamp).toLocaleDateString()}
                </span>
                {outcomeBadge(inv.outcome)}
                <span className="text-muted truncate">{inv.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/skills/admin/system-directory/_components/usage-section.tsx
git commit -m "feat(skills): add usage section component with stats and invocation list"
```

---

### Task 6: Ask API Route

**Files:**
- Create: `src/app/skills/admin/system-directory/api/ask/route.ts`

- [ ] **Step 1: Create the ask API route**

```bash
mkdir -p src/app/skills/admin/system-directory/api/ask
```

Create `src/app/skills/admin/system-directory/api/ask/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { question, entryName, fileContent, relatedContent } = await request.json()

    if (!question || !entryName || !fileContent) {
      return NextResponse.json({ error: "question, entryName, and fileContent are required" }, { status: 400 })
    }

    let contextBlock = `# ${entryName}\n\n${fileContent}`

    if (relatedContent && Array.isArray(relatedContent)) {
      for (const related of relatedContent) {
        contextBlock += `\n\n---\n\n# ${related.name}\n\n${related.content}`
      }
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: "You are explaining agents and skills in Gage's Claude Code setup. Answer concisely (2-3 sentences). You have the full file content for context. Be specific, not generic.",
      messages: [
        {
          role: "user",
          content: `Context:\n\n${contextBlock}\n\nQuestion: ${question}`,
        },
      ],
    })

    const answer = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")

    return NextResponse.json({ answer })
  } catch (error) {
    console.error("Ask API error:", error)
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/skills/admin/system-directory/api/ask/route.ts
git commit -m "feat(skills): add ask API route for AI Q&A about agents/skills"
```

---

### Task 7: Ask Section Component

**Files:**
- Create: `src/app/skills/admin/system-directory/_components/ask-section.tsx`

- [ ] **Step 1: Create the ask section component**

Create `src/app/skills/admin/system-directory/_components/ask-section.tsx`:

```typescript
"use client"

import { useState } from "react"
import type { DirectoryEntry } from "./directory-entry-card"

interface AskSectionProps {
  entry: DirectoryEntry
  allEntries: DirectoryEntry[]
}

export default function AskSection({ entry, allEntries }: AskSectionProps) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAsk() {
    if (!question.trim()) return
    setLoading(true)
    setAnswer(null)
    setError(null)

    // Check if the question references other entries by /name
    const relatedContent: { name: string; content: string }[] = []
    const refPattern = /\/([a-z][a-z0-9-]+)/g
    let match
    while ((match = refPattern.exec(question)) !== null) {
      const refName = match[1]
      if (refName !== entry.name) {
        const refEntry = allEntries.find((e) => e.name === refName)
        if (refEntry) {
          // Fetch the referenced entry's content
          try {
            const res = await fetch(
              `/skills/admin/system-directory/api/content?path=${encodeURIComponent(refEntry.filePath)}`
            )
            if (res.ok) {
              const data = await res.json()
              relatedContent.push({ name: refName, content: data.content })
            }
          } catch {
            // Skip if can't fetch
          }
        }
      }
    }

    // Fetch the selected entry's content
    try {
      const contentRes = await fetch(
        `/skills/admin/system-directory/api/content?path=${encodeURIComponent(entry.filePath)}`
      )
      const contentData = contentRes.ok ? await contentRes.json() : { content: entry.description }

      const res = await fetch("/skills/admin/system-directory/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          entryName: entry.name,
          fileContent: contentData.content,
          relatedContent: relatedContent.length > 0 ? relatedContent : undefined,
        }),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      setAnswer(data.answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get answer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask about this agent or skill..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleAsk()}
          disabled={loading}
          className="flex-1 bg-background border border-card-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="px-3 py-2 bg-accent text-white text-xs rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>
      {loading && (
        <div className="text-xs text-muted mt-2">Thinking...</div>
      )}
      {answer && (
        <div className="text-sm text-foreground mt-3 p-3 bg-background border border-card-border rounded-lg">
          {answer}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-400 mt-2">Error: {error}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/skills/admin/system-directory/_components/ask-section.tsx
git commit -m "feat(skills): add ask section component with auto-reference resolution"
```

---

### Task 8: Wire Accordions into Detail Panel

**Files:**
- Modify: `src/app/skills/admin/system-directory/_components/detail-panel.tsx`

- [ ] **Step 1: Add accordion imports and sections to the detail panel**

In `src/app/skills/admin/system-directory/_components/detail-panel.tsx`, add imports at the top after the existing import:

```typescript
import DetailAccordion from "./detail-accordion"
import AskSection from "./ask-section"
import UsageSection from "./usage-section"
import ContentPreview from "./content-preview"
```

Then, inside the returned JSX, after the file path section (after the closing `</div>` of `pt-4 mt-4 border-t`) and before the final closing `</div>` of the component, add:

```typescript
      {/* Accordion sections */}
      <div className="mt-4">
        <DetailAccordion title="Ask">
          <AskSection entry={entry} allEntries={allEntries} />
        </DetailAccordion>

        <DetailAccordion title="Usage">
          <UsageSection entryName={entry.name} />
        </DetailAccordion>

        <DetailAccordion title="Content">
          <ContentPreview filePath={entry.filePath} />
        </DetailAccordion>
      </div>
```

- [ ] **Step 2: Verify the detail panel renders with accordions**

Navigate to `http://localhost:3000/skills/admin/system-directory`. Select an entry. Below the overview metadata, you should see three collapsible sections: Ask, Usage, Content. Click each to expand.

- [ ] **Step 3: Commit**

```bash
git add src/app/skills/admin/system-directory/_components/detail-panel.tsx
git commit -m "feat(skills): wire ask, usage, and content accordions into detail panel"
```

---

### Task 9: Context Tree API Route

**Files:**
- Create: `src/app/skills/admin/system-directory/api/context-tree/route.ts`

Walks the filesystem for all CLAUDE.md and rules files, builds a nested tree, and cross-references with directory entries.

- [ ] **Step 1: Create the context tree API route**

```bash
mkdir -p src/app/skills/admin/system-directory/api/context-tree
```

Create `src/app/skills/admin/system-directory/api/context-tree/route.ts`:

```typescript
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"

interface ContextNode {
  filePath: string
  shortPath: string
  summary: string
  project: string
  depth: number
  children: ContextNode[]
  agents: string[]
  skills: string[]
  rules: string[]
}

function extractSummary(content: string): string {
  // Get text after first heading, before next heading or double newline
  const afterHeading = content.replace(/^#[^\n]*\n+/, "")
  const firstParagraph = afterHeading.split(/\n\n/)[0] || ""
  const cleaned = firstParagraph.replace(/[#*_`\[\]]/g, "").trim()
  if (cleaned.length <= 120) return cleaned
  const truncated = cleaned.slice(0, 120)
  const lastSpace = truncated.lastIndexOf(" ")
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "..."
}

function findClaudeMdFiles(dir: string, maxDepth = 10): string[] {
  const results: string[] = []
  if (maxDepth <= 0) return results

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "venv") continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isFile() && entry.name === "CLAUDE.md") {
        results.push(fullPath)
      } else if (entry.isDirectory()) {
        results.push(...findClaudeMdFiles(fullPath, maxDepth - 1))
      }
    }
  } catch {
    // Permission errors, etc.
  }
  return results
}

function findRulesFiles(claudeDir: string): string[] {
  const rulesDir = path.join(claudeDir, "rules")
  if (!fs.existsSync(rulesDir)) return []
  try {
    return fs.readdirSync(rulesDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.join(rulesDir, f))
  } catch {
    return []
  }
}

function discoverProjects(homeDir: string): { name: string; path: string }[] {
  const projects: { name: string; path: string }[] = []
  try {
    const entries = fs.readdirSync(homeDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue
      const projectPath = path.join(homeDir, entry.name)
      // Check if it has a CLAUDE.md or .claude directory
      const hasClaude = fs.existsSync(path.join(projectPath, "CLAUDE.md"))
      const hasClaudeDir = fs.existsSync(path.join(projectPath, ".claude"))
      if (hasClaude || hasClaudeDir) {
        projects.push({ name: entry.name, path: projectPath })
      }
    }
  } catch {
    // Skip
  }
  return projects
}

function getAgentsAndSkills(projectPath: string): { agents: string[]; skills: string[] } {
  const agents: string[] = []
  const skills: string[] = []

  const cmdDir = path.join(projectPath, ".claude", "commands")
  if (fs.existsSync(cmdDir)) {
    try {
      agents.push(
        ...fs.readdirSync(cmdDir)
          .filter((f) => f.endsWith(".md"))
          .map((f) => f.replace(/\.md$/, ""))
      )
    } catch { /* skip */ }
  }

  const skillsDir = path.join(projectPath, ".claude", "skills")
  if (fs.existsSync(skillsDir)) {
    try {
      const dirs = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory())
      for (const d of dirs) {
        if (fs.existsSync(path.join(skillsDir, d.name, "SKILL.md"))) {
          skills.push(d.name)
        }
      }
    } catch { /* skip */ }
  }

  return { agents, skills }
}

function buildTree(claudeMdFiles: string[], projectRoot: string, projectName: string): ContextNode[] {
  // Sort by depth so parents come first
  const sorted = claudeMdFiles.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length)
  const nodes: ContextNode[] = []

  for (const filePath of sorted) {
    const relative = path.relative(projectRoot, filePath)
    const depth = relative.split(path.sep).length - 1
    const content = fs.readFileSync(filePath, "utf-8")

    nodes.push({
      filePath,
      shortPath: relative,
      summary: extractSummary(content),
      project: projectName,
      depth,
      children: [],
      agents: [],
      skills: [],
      rules: [],
    })
  }

  // Build parent-child relationships
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    const nodeDir = path.dirname(node.filePath)
    // Find the closest ancestor
    for (let j = i - 1; j >= 0; j--) {
      const potentialParent = nodes[j]
      const parentDir = path.dirname(potentialParent.filePath)
      if (nodeDir.startsWith(parentDir + path.sep) && potentialParent.depth < node.depth) {
        potentialParent.children.push(node)
        nodes.splice(i, 1)
        break
      }
    }
  }

  return nodes
}

export async function GET() {
  const homeDir = os.homedir()
  const tree: ContextNode[] = []

  // 1. Global CLAUDE.md
  const globalClaudeMd = path.join(homeDir, ".claude", "CLAUDE.md")
  if (fs.existsSync(globalClaudeMd)) {
    const content = fs.readFileSync(globalClaudeMd, "utf-8")
    const globalRules = findRulesFiles(path.join(homeDir, ".claude"))
    const globalSkills = path.join(homeDir, ".claude", "skills")
    const skills: string[] = []
    if (fs.existsSync(globalSkills)) {
      try {
        const dirs = fs.readdirSync(globalSkills, { withFileTypes: true }).filter((d) => d.isDirectory())
        for (const d of dirs) {
          if (fs.existsSync(path.join(globalSkills, d.name, "SKILL.md"))) {
            skills.push(d.name)
          }
        }
      } catch { /* skip */ }
    }

    tree.push({
      filePath: globalClaudeMd,
      shortPath: "~/.claude/CLAUDE.md",
      summary: extractSummary(content),
      project: "global",
      depth: 0,
      children: [],
      agents: [],
      skills,
      rules: globalRules.map((r) => path.basename(r)),
    })
  }

  // 2. Project trees
  const projects = discoverProjects(homeDir)
  for (const project of projects) {
    const claudeFiles = findClaudeMdFiles(project.path)
    if (claudeFiles.length === 0) continue

    const projectNodes = buildTree(claudeFiles, project.path, project.name)
    const { agents, skills } = getAgentsAndSkills(project.path)
    const projectRules = findRulesFiles(path.join(project.path, ".claude"))

    // Attach agents/skills to the root node of the project
    if (projectNodes.length > 0) {
      projectNodes[0].agents = agents
      projectNodes[0].skills = skills
      projectNodes[0].rules = projectRules.map((r) => path.basename(r))
    }

    tree.push(...projectNodes)
  }

  return NextResponse.json(tree)
}
```

- [ ] **Step 2: Test the context tree API**

```bash
curl -s http://localhost:3000/skills/admin/system-directory/api/context-tree | python3 -c "
import sys,json
nodes = json.load(sys.stdin)
def show(n, indent=0):
    print(' ' * indent + n['shortPath'] + ' (' + n['project'] + ')' + (' [' + str(len(n['children'])) + ' children]' if n['children'] else ''))
    for c in n['children']:
        show(c, indent + 2)
for n in nodes:
    show(n)
"
```

Expected: Tree showing `~/.claude/CLAUDE.md` (global) and project CLAUDE.md files with nested children.

- [ ] **Step 3: Commit**

```bash
git add src/app/skills/admin/system-directory/api/context-tree/route.ts
git commit -m "feat(skills): add context tree API route — discovers all CLAUDE.md files"
```

---

### Task 10: Context Tree Node Component

**Files:**
- Create: `src/app/skills/admin/system-directory/_components/context-tree-node.tsx`

Recursive component that renders a single tree node with connecting lines and child nodes.

- [ ] **Step 1: Create the tree node component**

Create `src/app/skills/admin/system-directory/_components/context-tree-node.tsx`:

```typescript
"use client"

interface ContextNode {
  filePath: string
  shortPath: string
  summary: string
  project: string
  depth: number
  children: ContextNode[]
  agents: string[]
  skills: string[]
  rules: string[]
}

interface ContextTreeNodeProps {
  node: ContextNode
  selectedPath: string | null
  onSelect: (node: ContextNode) => void
}

export default function ContextTreeNode({
  node,
  selectedPath,
  onSelect,
}: ContextTreeNodeProps) {
  const isSelected = selectedPath === node.filePath
  const childCount = node.children.length
  const agentCount = node.agents.length
  const skillCount = node.skills.length
  const ruleCount = node.rules.length

  return (
    <div className="ml-4">
      {/* Node card */}
      <button
        onClick={() => onSelect(node)}
        className={`w-full text-left rounded-lg border p-3 mb-2 transition-colors hover:bg-white/5 cursor-pointer ${
          isSelected ? "border-accent bg-accent/5" : "border-card-border"
        }`}
      >
        <div className="font-mono text-xs font-medium text-foreground mb-1">
          {node.shortPath}
        </div>
        <div className="text-[11px] text-muted line-clamp-2">{node.summary}</div>
        {/* Count badges */}
        <div className="flex gap-2 mt-2">
          {childCount > 0 && (
            <span className="text-[9px] bg-accent/10 text-accent-hover px-1.5 py-0.5 rounded">
              {childCount} children
            </span>
          )}
          {agentCount > 0 && (
            <span className="text-[9px] bg-accent/10 text-accent-hover px-1.5 py-0.5 rounded">
              {agentCount} agents
            </span>
          )}
          {skillCount > 0 && (
            <span className="text-[9px] bg-warning/10 text-warning px-1.5 py-0.5 rounded">
              {skillCount} skills
            </span>
          )}
          {ruleCount > 0 && (
            <span className="text-[9px] bg-white/5 text-muted px-1.5 py-0.5 rounded">
              {ruleCount} rules
            </span>
          )}
        </div>
      </button>

      {/* Children with connecting line */}
      {node.children.length > 0 && (
        <div className="border-l border-card-border ml-3 pl-2">
          {node.children.map((child) => (
            <ContextTreeNode
              key={child.filePath}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export type { ContextNode }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/skills/admin/system-directory/_components/context-tree-node.tsx
git commit -m "feat(skills): add recursive context tree node component"
```

---

### Task 11: Context Detail Panel Component

**Files:**
- Create: `src/app/skills/admin/system-directory/_components/context-detail-panel.tsx`

Side panel that shows full CLAUDE.md content when a tree node is selected.

- [ ] **Step 1: Create the context detail panel**

Create `src/app/skills/admin/system-directory/_components/context-detail-panel.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import type { ContextNode } from "./context-tree-node"

interface ContextDetailPanelProps {
  node: ContextNode | null
  onSwitchToDirectory?: (entryName: string) => void
}

export default function ContextDetailPanel({
  node,
  onSwitchToDirectory,
}: ContextDetailPanelProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!node) {
      setContent(null)
      return
    }
    setLoading(true)
    fetch(`/skills/admin/system-directory/api/content?path=${encodeURIComponent(node.filePath)}`)
      .then((res) => (res.ok ? res.json() : { content: "Failed to load file" }))
      .then((data) => {
        setContent(data.content)
        setLoading(false)
      })
      .catch(() => {
        setContent("Failed to load file")
        setLoading(false)
      })
  }, [node?.filePath])

  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Select a CLAUDE.md file to view its contents
      </div>
    )
  }

  return (
    <div className="p-5 overflow-y-auto h-full">
      {/* Header */}
      <div className="font-mono text-sm font-semibold mb-1">{node.shortPath}</div>
      <div className="text-[10px] text-muted mb-4 font-mono break-all">{node.filePath}</div>

      {/* Children list */}
      {node.children.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Child CLAUDE.md files
          </div>
          <div className="space-y-1">
            {node.children.map((child) => (
              <div key={child.filePath} className="text-xs text-accent-hover font-mono">
                {child.shortPath}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agents at this level */}
      {node.agents.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Agents
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.agents.map((name) => (
              <button
                key={name}
                onClick={() => onSwitchToDirectory?.(name)}
                className="text-xs bg-accent/10 border border-accent/30 text-accent-hover px-2 py-1 rounded cursor-pointer hover:opacity-80"
              >
                /{name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Skills at this level */}
      {node.skills.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.skills.map((name) => (
              <button
                key={name}
                onClick={() => onSwitchToDirectory?.(name)}
                className="text-xs bg-warning/10 border border-warning/30 text-warning px-2 py-1 rounded cursor-pointer hover:opacity-80"
              >
                /{name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      {node.rules.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Rules
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.rules.map((name) => (
              <code key={name} className="text-xs bg-background px-1.5 py-0.5 rounded border border-card-border">
                {name}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* File content */}
      <div className="mt-4 pt-4 border-t border-card-border">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Content</div>
        {loading ? (
          <div className="text-xs text-muted">Loading...</div>
        ) : (
          <pre className="text-xs font-mono text-foreground/80 bg-background border border-card-border rounded-lg p-3 overflow-auto max-h-[500px] whitespace-pre-wrap break-words">
            {content}
          </pre>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/skills/admin/system-directory/_components/context-detail-panel.tsx
git commit -m "feat(skills): add context detail panel for CLAUDE.md viewer"
```

---

### Task 12: Context Tree View Component

**Files:**
- Create: `src/app/skills/admin/system-directory/_components/context-tree-view.tsx`

The full Context Tree tab content — fetches tree data, renders tree + side panel.

- [ ] **Step 1: Create the context tree view**

Create `src/app/skills/admin/system-directory/_components/context-tree-view.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import ContextTreeNode from "./context-tree-node"
import type { ContextNode } from "./context-tree-node"
import ContextDetailPanel from "./context-detail-panel"

interface ContextTreeViewProps {
  onSwitchToDirectory?: (entryName: string) => void
}

export default function ContextTreeView({ onSwitchToDirectory }: ContextTreeViewProps) {
  const [tree, setTree] = useState<ContextNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<ContextNode | null>(null)

  useEffect(() => {
    fetch("/skills/admin/system-directory/api/context-tree")
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setTree(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  function handleSelect(node: ContextNode) {
    setSelectedNode((prev) =>
      prev?.filePath === node.filePath ? null : node
    )
  }

  // Count total CLAUDE.md files recursively
  function countNodes(nodes: ContextNode[]): number {
    return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        Scanning for CLAUDE.md files...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 text-sm">
        Error: {error}
      </div>
    )
  }

  const totalFiles = countNodes(tree)

  return (
    <div className="border border-card-border rounded-xl overflow-hidden bg-card-bg">
      {/* Header */}
      <div className="px-5 py-3 border-b border-card-border flex items-center justify-between">
        <span className="text-sm font-medium">Context Inheritance Tree</span>
        <span className="text-xs text-muted">{totalFiles} CLAUDE.md files</span>
      </div>

      {/* Split view: tree + detail */}
      <div className="flex" style={{ height: "calc(100vh - 220px)" }}>
        {/* Left: Tree */}
        <div className="w-[60%] border-r border-card-border p-4 overflow-auto">
          {tree.map((node) => (
            <ContextTreeNode
              key={node.filePath}
              node={node}
              selectedPath={selectedNode?.filePath || null}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Right: Detail panel */}
        <div className="w-[40%] overflow-y-auto">
          <ContextDetailPanel
            node={selectedNode}
            onSwitchToDirectory={onSwitchToDirectory}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/skills/admin/system-directory/_components/context-tree-view.tsx
git commit -m "feat(skills): add context tree view with split layout"
```

---

### Task 13: Add Page-Level Tabs and Wire Everything Together

**Files:**
- Modify: `src/app/skills/admin/system-directory/page.tsx`

Replace the current page with a tabbed layout that switches between Directory and Context Tree.

- [ ] **Step 1: Rewrite page.tsx to a client component with tabs**

Replace the contents of `src/app/skills/admin/system-directory/page.tsx`:

```typescript
"use client"

import { useState } from "react"
import PageHeader from "@/components/page-header"
import SystemDirectoryView from "./_components/system-directory-view"
import ContextTreeView from "./_components/context-tree-view"

export default function SystemDirectoryPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "context-tree">("directory")
  const [directorySelection, setDirectorySelection] = useState<string | null>(null)

  function handleSwitchToDirectory(entryName: string) {
    setDirectorySelection(entryName)
    setActiveTab("directory")
  }

  return (
    <div>
      <PageHeader
        title="System Directory"
        description="All agents and skills installed on this machine"
        status="active"
      />

      {/* Tab bar */}
      <div className="flex gap-6 mb-6 border-b border-card-border">
        <button
          onClick={() => setActiveTab("directory")}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === "directory"
              ? "text-foreground border-b-2 border-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Directory
        </button>
        <button
          onClick={() => setActiveTab("context-tree")}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === "context-tree"
              ? "text-foreground border-b-2 border-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Context Tree
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "directory" ? (
        <SystemDirectoryView initialSelection={directorySelection} />
      ) : (
        <ContextTreeView onSwitchToDirectory={handleSwitchToDirectory} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update SystemDirectoryView to accept initialSelection prop**

In `src/app/skills/admin/system-directory/_components/system-directory-view.tsx`, update the component to accept and use the `initialSelection` prop.

Change the function signature from:

```typescript
export default function SystemDirectoryView() {
```

to:

```typescript
interface SystemDirectoryViewProps {
  initialSelection?: string | null
}

export default function SystemDirectoryView({ initialSelection }: SystemDirectoryViewProps) {
```

Then add a `useEffect` after the existing `useEffect` for fetching entries:

```typescript
  useEffect(() => {
    if (initialSelection) {
      setSelectedName(initialSelection)
    }
  }, [initialSelection])
```

- [ ] **Step 3: Verify tabs work**

Navigate to `http://localhost:3000/skills/admin/system-directory`. Verify:
- Two tabs appear: "Directory" and "Context Tree"
- Directory tab shows the existing split view
- Context Tree tab shows the CLAUDE.md tree
- Clicking an agent/skill pill in the Context Tree switches to Directory tab and selects that entry

- [ ] **Step 4: Commit**

```bash
git add src/app/skills/admin/system-directory/page.tsx src/app/skills/admin/system-directory/_components/system-directory-view.tsx
git commit -m "feat(skills): add page-level tabs — Directory and Context Tree"
```

---

### Task 14: Module CLAUDE.md

**Files:**
- Create: `src/app/skills/admin/system-directory/CLAUDE.md`

- [ ] **Step 1: Create the module CLAUDE.md**

Create `src/app/skills/admin/system-directory/CLAUDE.md`:

```markdown
# System Directory (Admin) — CLAUDE.md

Admin page for viewing all agents, skills, and CLAUDE.md files installed on the local machine. Lives under Skills Hub → Admin.

## Owns

- **page.tsx:** Page shell with Directory/Context Tree tabs
- **_components/:** system-directory-view, directory-entry-card, detail-panel, context-tree-view, ask-section, usage-section, content-preview, detail-accordion, context-tree-node, context-detail-panel
- **api/:** GET directory scan, GET usage stats, POST ask, GET content, GET context-tree

## Status

Active.

## Connections

- Reads filesystem for agent/skill `.md` files and CLAUDE.md files
- Reads Supabase `skill_catalog` for hub status (read-only)
- Reads Supabase `skill_usage` for usage stats (read-only)
- Calls Anthropic API (Sonnet) for Ask feature
- No owned tables — purely a read/display layer
```

- [ ] **Step 2: Commit**

```bash
git add src/app/skills/admin/system-directory/CLAUDE.md
git commit -m "docs(skills): add module CLAUDE.md for system directory"
```

---

### Task 15: Integration Test

**Files:**
- No new files — manual verification

- [ ] **Step 1: Test Directory tab with accordions**

Open `http://localhost:3000/skills/admin/system-directory`. Select `/orchestrator`. Verify:
- [ ] Overview section shows all metadata as before
- [ ] Three accordions below: Ask, Usage, Content — all collapsed by default
- [ ] Expand Ask → type "How does this agent work?" → get an answer
- [ ] Expand Ask → type "How does this differ from /subagent-driven-development?" → get an answer that references both
- [ ] Expand Usage → shows "Run /skill-analytics..." empty state (or real data if it exists)
- [ ] Expand Content → shows the full orchestrator.md file content

- [ ] **Step 2: Test Context Tree tab**

Click "Context Tree" tab. Verify:
- [ ] Tree shows `~/.claude/CLAUDE.md` (global) as top node
- [ ] Project nodes appear below with nested CLAUDE.md files
- [ ] Clicking a node shows its content in the side panel
- [ ] Agent/skill pills in the side panel switch to Directory tab on click

- [ ] **Step 3: Test edge cases**

- [ ] Search in Directory tab still works with accordions present
- [ ] Switching between tabs preserves state within each tab
- [ ] Content preview for a file with malformed frontmatter still shows the raw text

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(skills): system directory enhanced — ask, usage, content preview, and context tree"
```
