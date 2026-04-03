import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"
import { createServerClient } from "@/lib/supabase-server"

interface SkillFile {
  name: string
  path: string
  content: string
}

interface SkillRelationships {
  files: string[]       // file paths it reads/writes (config/funds.py, src/gmail_scanner.py)
  tables: string[]      // Supabase tables (skill_usage, learning_log)
  invokes: string[]     // other skills/agents it calls (/skill-name)
  services: string[]    // external services (Gmail, Supabase, Notion, Anthropic)
}

interface SkillInfo {
  files: SkillFile[]
  relationships: SkillRelationships
}

interface ContextNode {
  filePath: string
  shortPath: string
  summary: string
  content: string
  project: string
  depth: number
  children: ContextNode[]
  agents: string[]
  skills: string[]
  rules: string[]
  skillFiles: Record<string, SkillInfo>
}

function extractSummary(content: string): string {
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

function parseRelationships(content: string): SkillRelationships {
  const files: string[] = []
  const tables: string[] = []
  const invokes: string[] = []
  const services: string[] = []

  // Extract file paths: backtick-wrapped paths with extensions
  const filePattern = /`([a-zA-Z0-9_\-./]+\.(py|ts|tsx|js|jsx|json|md|yaml|yml|sh|sql|css|html))`/g
  let match
  while ((match = filePattern.exec(content)) !== null) {
    const f = match[1]
    // Skip common non-file references
    // Skip self-references and overly generic names
    if (!f.includes(" ") && f !== "SKILL.md" && f !== "patterns.md" && !files.includes(f)) {
      files.push(f)
    }
  }

  // Extract Supabase table references
  const tablePatterns = [
    /`(\w+)`\s+table/gi,
    /table[s]?[:\s]+`(\w+)`/gi,
    /from\s+`?(\w+)`?/gi,
    /into\s+`?(\w+)`?/gi,
    /\*\*Tables?:\*\*[^*]*`(\w+)`/gi,
  ]
  const knownTables = new Set([
    "skills", "skill_usage", "skill_catalog", "skill_evals", "skill_versions", "skill_proposals",
    "learning_log", "ai_initiatives", "funds", "fund_returns", "fund_allocations", "reconciliation_log",
    "acio_deals", "deal_notes", "context_tree_cache",
  ])
  for (const pattern of tablePatterns) {
    while ((match = pattern.exec(content)) !== null) {
      const t = match[1].toLowerCase()
      if (knownTables.has(t) && !tables.includes(t)) {
        tables.push(t)
      }
    }
  }
  // Also scan for known table names directly
  for (const t of knownTables) {
    if (content.includes(t) && !tables.includes(t)) {
      tables.push(t)
    }
  }

  // Extract skill/agent invocations: /slash-command references
  const slashPattern = /(?:^|[^a-zA-Z0-9])\/([a-z][a-z0-9-]+)(?:[^a-zA-Z0-9/]|$)/gm
  const skipSlugs = new Set(["dev", "api", "skills", "app", "src", "config", "docs", "data", "scripts", "claude", "master", "main", "public", "var", "usr", "bin", "home", "tmp", "etc"])
  while ((match = slashPattern.exec(content)) !== null) {
    const s = match[1]
    if (!skipSlugs.has(s) && s.length > 2 && s.length < 30 && !/^[a-z0-9]{20,}$/.test(s) && !invokes.includes(s)) {
      invokes.push(s)
    }
  }

  // Extract external services
  const serviceKeywords: Record<string, string> = {
    "Gmail": "Gmail",
    "gmail": "Gmail",
    "Supabase": "Supabase",
    "supabase": "Supabase",
    "Notion": "Notion",
    "notion": "Notion",
    "Anthropic": "Anthropic API",
    "Claude API": "Anthropic API",
    "Attio": "Attio CRM",
    "Playwright": "Playwright",
    "Mailchimp": "Mailchimp",
  }
  for (const [keyword, service] of Object.entries(serviceKeywords)) {
    if (content.includes(keyword) && !services.includes(service)) {
      services.push(service)
    }
  }

  return { files, tables, invokes, services }
}

function scanSkillFiles(skillsDir: string): Record<string, SkillInfo> {
  const result: Record<string, SkillInfo> = {}
  if (!fs.existsSync(skillsDir)) return result

  try {
    const dirs = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory())
    for (const d of dirs) {
      const skillDir = path.join(skillsDir, d.name)
      const files: SkillFile[] = []
      let allContent = ""
      try {
        const entries = fs.readdirSync(skillDir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isFile()) {
            let content = ""
            try {
              content = fs.readFileSync(path.join(skillDir, entry.name), "utf-8")
            } catch { /* skip binary or unreadable */ }
            files.push({ name: entry.name, path: path.join(skillDir, entry.name), content })
            if (entry.name.endsWith(".md")) allContent += "\n" + content
          } else if (entry.isDirectory()) {
            try {
              const subEntries = fs.readdirSync(path.join(skillDir, entry.name), { withFileTypes: true })
              for (const sub of subEntries) {
                if (!sub.isFile()) continue
                let content = ""
                try {
                  content = fs.readFileSync(path.join(skillDir, entry.name, sub.name), "utf-8")
                } catch { /* skip */ }
                files.push({ name: `${entry.name}/${sub.name}`, path: path.join(skillDir, entry.name, sub.name), content })
              }
            } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }

      const relationships = parseRelationships(allContent)
      if (files.length > 0) result[d.name] = { files, relationships }
    }
  } catch { /* skip */ }

  return result
}

function buildTree(claudeMdFiles: string[], projectRoot: string, projectName: string): ContextNode[] {
  const sorted = claudeMdFiles.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length)
  const nodes: ContextNode[] = []

  for (const filePath of sorted) {
    const relative = path.relative(projectRoot, filePath)
    const depth = relative.split(path.sep).length - 1
    let content = ""
    try {
      content = fs.readFileSync(filePath, "utf-8")
    } catch { /* skip */ }

    nodes.push({
      filePath,
      shortPath: relative,
      summary: extractSummary(content),
      content,
      project: projectName,
      depth,
      children: [],
      agents: [],
      skills: [],
      rules: [],
      skillFiles: {},
    })
  }

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    const nodeDir = path.dirname(node.filePath)
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

function scanLocalTree(): ContextNode[] {
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

    const globalSkillFiles = scanSkillFiles(globalSkills)

    tree.push({
      filePath: globalClaudeMd,
      shortPath: "~/.claude/CLAUDE.md",
      summary: extractSummary(content),
      content,
      project: "global",
      depth: 0,
      children: [],
      agents: [],
      skills,
      rules: globalRules.map((r) => path.basename(r)),
      skillFiles: globalSkillFiles,
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

    const projectSkillFiles = scanSkillFiles(path.join(project.path, ".claude", "skills"))

    if (projectNodes.length > 0) {
      projectNodes[0].agents = agents
      projectNodes[0].skills = skills
      projectNodes[0].rules = projectRules.map((r) => path.basename(r))
      projectNodes[0].skillFiles = projectSkillFiles
    }

    tree.push(...projectNodes)
  }

  return tree
}

function hasLocalFilesystem(): boolean {
  try {
    const homeDir = os.homedir()
    return fs.existsSync(path.join(homeDir, ".claude"))
  } catch {
    return false
  }
}

async function cacheToSupabase(tree: ContextNode[]) {
  try {
    const supabase = createServerClient()
    await supabase
      .from("context_tree_cache")
      .upsert({ id: "singleton", tree_json: tree, updated_at: new Date().toISOString() })
  } catch {
    // Cache write is best-effort — don't fail the request
  }
}

async function readFromCache(): Promise<{ tree: ContextNode[]; updatedAt: string | null }> {
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from("context_tree_cache")
      .select("tree_json, updated_at")
      .eq("id", "singleton")
      .single()
    if (data) {
      return { tree: data.tree_json as ContextNode[], updatedAt: data.updated_at }
    }
  } catch {
    // Cache read failed
  }
  return { tree: [], updatedAt: null }
}

export async function GET() {
  if (hasLocalFilesystem()) {
    // Local: scan filesystem, cache to Supabase, return fresh data
    const tree = scanLocalTree()
    cacheToSupabase(tree) // fire-and-forget
    return NextResponse.json({ tree, source: "local", updatedAt: new Date().toISOString() })
  }

  // Vercel: read from Supabase cache
  const { tree, updatedAt } = await readFromCache()
  return NextResponse.json({ tree, source: "cache", updatedAt })
}
