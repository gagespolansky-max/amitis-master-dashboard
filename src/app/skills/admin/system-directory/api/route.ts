import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import fs from "fs"
import path from "path"
import os from "os"
import matter from "gray-matter"

interface DirectoryEntry {
  name: string
  slashCommand: string
  layer: "agent" | "skill"
  scope: "global" | string
  description: string
  owns: string[]
  uses: string[]
  usedBy: string[]
  filePath: string
  hubStatus: "in_catalog" | "local_only"
}

interface RawEntry extends Omit<DirectoryEntry, "usedBy" | "hubStatus"> {}

function truncateDescription(desc: string, max = 80): string {
  if (!desc || desc.length <= max) return desc || ""
  const truncated = desc.slice(0, max)
  const lastSpace = truncated.lastIndexOf(" ")
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "..."
}

function parseOwnership(content: string): string[] {
  const owns: string[] = []
  const patterns = [
    /(?:owns?|manages?|writes?\s+to|custody\s+over)[:\s]+[`"]?([^`"\n,]+)[`"]?/gi,
    /\*\*(?:Owns?|Tables?|Files?)[:\s]*\*\*\s*(.+)/gi,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const items = match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      owns.push(...items)
    }
  }
  const tablePattern = /`([a-z_]+)`/g
  const ownershipSection = content.match(/## Owns[\s\S]*?(?=##|$)/i)
  if (ownershipSection) {
    let match
    while ((match = tablePattern.exec(ownershipSection[0])) !== null) {
      if (!owns.includes(match[1])) owns.push(match[1])
    }
  }
  return [...new Set(owns)].slice(0, 10)
}

function parseUses(content: string): string[] {
  const uses: string[] = []
  const slashPattern = /\/([a-z][a-z0-9-]+)/g
  let match
  while ((match = slashPattern.exec(content)) !== null) {
    const name = match[1]
    const before = content.slice(Math.max(0, match.index - 20), match.index)
    if (before.match(/https?:|src\/|\.claude|node_modules|path|dir|file/i)) continue
    if (!uses.includes(name)) uses.push(name)
  }
  return uses
}

function discoverProjects(homeDir: string): { name: string; path: string }[] {
  const projects: { name: string; path: string }[] = []
  try {
    const entries = fs.readdirSync(homeDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue
      const projectPath = path.join(homeDir, entry.name)
      const hasCommands = fs.existsSync(path.join(projectPath, ".claude", "commands"))
      const hasSkills = fs.existsSync(path.join(projectPath, ".claude", "skills"))
      if (hasCommands || hasSkills) {
        projects.push({ name: entry.name, path: projectPath })
      }
    }
  } catch {
    // If home dir is unreadable, return empty
  }
  return projects
}

function scanDirectory(
  dirPath: string,
  pattern: "commands" | "skills",
  layer: "agent" | "skill",
  scope: string
): RawEntry[] {
  const entries: RawEntry[] = []
  if (!fs.existsSync(dirPath)) return entries

  if (pattern === "commands") {
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"))
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const raw = fs.readFileSync(filePath, "utf-8")
      let data: Record<string, unknown> = {}
      let content = raw
      try {
        const parsed = matter(raw)
        data = parsed.data
        content = parsed.content
      } catch {
        // Malformed frontmatter — use raw content and derive name from filename
      }
      const name = (data.name as string) || file.replace(/\.md$/, "")
      entries.push({
        name,
        slashCommand: `/${name}`,
        layer,
        scope,
        description: truncateDescription(data.description as string || ""),
        owns: parseOwnership(content),
        uses: parseUses(content),
        filePath,
      })
    }
  } else {
    const dirs = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
    for (const dir of dirs) {
      const skillPath = path.join(dirPath, dir.name, "SKILL.md")
      if (!fs.existsSync(skillPath)) continue
      const raw = fs.readFileSync(skillPath, "utf-8")
      let data: Record<string, unknown> = {}
      let content = raw
      try {
        const parsed = matter(raw)
        data = parsed.data
        content = parsed.content
      } catch {
        // Malformed frontmatter — use raw content and derive name from dirname
      }
      const name = (data.name as string) || dir.name
      entries.push({
        name,
        slashCommand: `/${name}`,
        layer,
        scope,
        description: truncateDescription(data.description as string || ""),
        owns: parseOwnership(content),
        uses: parseUses(content),
        filePath: skillPath,
      })
    }
  }
  return entries
}

export async function GET() {
  const homeDir = os.homedir()
  const allRaw: RawEntry[] = []

  // Global skills
  allRaw.push(
    ...scanDirectory(
      path.join(homeDir, ".claude", "skills"),
      "skills",
      "skill",
      "global"
    )
  )

  // Project agents and skills
  const projects = discoverProjects(homeDir)
  for (const project of projects) {
    allRaw.push(
      ...scanDirectory(
        path.join(project.path, ".claude", "commands"),
        "commands",
        "agent",
        `project:${project.name}`
      )
    )
    allRaw.push(
      ...scanDirectory(
        path.join(project.path, ".claude", "skills"),
        "skills",
        "skill",
        `project:${project.name}`
      )
    )
  }

  // Compute usedBy (inverse of uses)
  const nameSet = new Set(allRaw.map((e) => e.name))
  const usedByMap: Record<string, string[]> = {}
  for (const entry of allRaw) {
    for (const used of entry.uses) {
      if (nameSet.has(used)) {
        if (!usedByMap[used]) usedByMap[used] = []
        if (!usedByMap[used].includes(entry.name)) {
          usedByMap[used].push(entry.name)
        }
      }
    }
  }

  // Check hub status against skill_catalog
  let catalogNames: Set<string> = new Set()
  try {
    const supabase = createServerClient()
    const { data } = await supabase.from("skill_catalog").select("name")
    if (data) {
      catalogNames = new Set(data.map((r: { name: string }) => r.name.toLowerCase()))
    }
  } catch {
    // If Supabase is unreachable, default all to local_only
  }

  // Build final entries
  const entries: DirectoryEntry[] = allRaw.map((raw) => ({
    ...raw,
    usedBy: usedByMap[raw.name] || [],
    hubStatus: catalogNames.has(raw.name.toLowerCase()) ? "in_catalog" : "local_only",
  }))

  // Sort: agents first, then skills, alphabetical within each
  entries.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer === "agent" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json(entries)
}
