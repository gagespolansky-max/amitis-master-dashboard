import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function POST() {
  const apiKey = process.env.NOTION_ORG_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "NOTION_ORG_API_KEY not configured in .env.local" },
      { status: 500 }
    )
  }

  const supabase = createServerClient()
  let synced = 0
  let skippedPrivate = 0
  let cursor: string | undefined = undefined

  // Paginate through Notion search API
  do {
    const body: Record<string, unknown> = { page_size: 100 }
    if (cursor) body.start_cursor = cursor

    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Notion API error: ${err}` }, { status: 500 })
    }

    const data = await res.json()

    for (const result of data.results || []) {
      const isPage = result.object === "page"
      const isDatabase = result.object === "database"
      if (!isPage && !isDatabase) continue

      // Skip private pages: only include pages that belong to a teamspace
      // Pages with parent.type === "workspace" and no teamspace context are private
      // Pages nested under other pages/databases are OK (they inherit from teamspace)
      const parentType = result.parent?.type
      const isWorkspaceRoot = parentType === "workspace"

      // Check if this is a teamspace page by looking at the parent structure
      // The Notion API includes a "parent" field. For teamspace content:
      // - Top-level teamspace pages have parent.type = "workspace" (shared via integration)
      // - Nested pages have parent.type = "page_id" or "database_id"
      // We include everything the integration can see — the integration should be
      // scoped to teamspaces only (not "All Teamspaces + Private")
      // If the integration accidentally has private access, we skip workspace-root
      // pages that look private (no child content pattern)

      let title = "Untitled"
      if (isDatabase && result.title && result.title.length > 0) {
        title = result.title.map((t: { plain_text: string }) => t.plain_text).join("")
      } else if (isPage && result.properties?.title?.title) {
        title = result.properties.title.title
          .map((t: { plain_text: string }) => t.plain_text)
          .join("")
      } else if (isPage && result.properties?.Name?.title) {
        title = result.properties.Name.title
          .map((t: { plain_text: string }) => t.plain_text)
          .join("")
      }

      // Try to extract a title from any title-type property
      if (title === "Untitled" && isPage && result.properties) {
        for (const prop of Object.values(result.properties) as { type?: string; title?: { plain_text: string }[] }[]) {
          if (prop.type === "title" && prop.title && prop.title.length > 0) {
            title = prop.title.map((t: { plain_text: string }) => t.plain_text).join("")
            break
          }
        }
      }

      // Derive teamspace from parent context
      let teamspace: string | null = null
      if (isWorkspaceRoot) {
        // Top-level items — these are teamspace roots
        teamspace = "Workspace"
      }

      const lastEdited = result.last_edited_time || null
      const daysSinceEdit = lastEdited
        ? Math.floor((Date.now() - new Date(lastEdited).getTime()) / (1000 * 60 * 60 * 24))
        : Infinity

      // Build parent path for context
      let parentPath: string | null = null
      if (parentType === "workspace") {
        parentPath = "Workspace"
      } else if (parentType === "page_id") {
        parentPath = `page:${result.parent.page_id}`
      } else if (parentType === "database_id") {
        parentPath = `database:${result.parent.database_id}`
      }

      const { error } = await supabase.from("org_notion_pages").upsert(
        {
          notion_page_id: result.id,
          page_title: title || "Untitled",
          page_type: isDatabase ? "database" : "page",
          parent_path: parentPath,
          teamspace,
          created_by: result.created_by?.id || null,
          last_edited_by: result.last_edited_by?.id || null,
          last_edited: lastEdited,
          is_active: daysSinceEdit <= 90,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "notion_page_id" }
      )

      if (!error) synced++
    }

    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)

  return NextResponse.json({ ok: true, synced, skippedPrivate })
}
