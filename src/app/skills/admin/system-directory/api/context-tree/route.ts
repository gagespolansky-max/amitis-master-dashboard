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
      project: projectName,
      depth,
      children: [],
      agents: [],
      skills: [],
      rules: [],
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

    if (projectNodes.length > 0) {
      projectNodes[0].agents = agents
      projectNodes[0].skills = skills
      projectNodes[0].rules = projectRules.map((r) => path.basename(r))
    }

    tree.push(...projectNodes)
  }

  return NextResponse.json(tree)
}
