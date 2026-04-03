import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import os from "os"
import path from "path"

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path")
  if (!filePath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 })
  }

  const homeDir = os.homedir()
  const normalized = path.normalize(filePath)
  if (!normalized.endsWith(".md")) {
    return NextResponse.json({ error: "only .md files allowed" }, { status: 403 })
  }
  const globalClaude = path.join(homeDir, ".claude")
  const isGlobal = normalized.startsWith(globalClaude + path.sep) || normalized === path.join(homeDir, ".claude", "CLAUDE.md")
  const isProject = normalized.includes(path.sep + ".claude" + path.sep) && normalized.startsWith(homeDir + path.sep)
  const isProjectClaude = normalized.endsWith("CLAUDE.md") && normalized.startsWith(homeDir + path.sep)
  if (!isGlobal && !isProject && !isProjectClaude) {
    return NextResponse.json({ error: "path not allowed" }, { status: 403 })
  }

  try {
    const content = fs.readFileSync(normalized, "utf-8")
    return NextResponse.json({ content })
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 })
  }
}
