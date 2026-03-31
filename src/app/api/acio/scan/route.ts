import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { searchThreads, fetchThreadMeta } from "@/lib/acio/gmail"
import { classifyThread, extractDealMetadata } from "@/lib/acio/classify"

const INTERNAL_DOMAINS = ["amitiscapital.com", "theamitisgroup.com"]

const BASELINE_QUERIES = [
  '"DD call" OR "due diligence" OR "data room"',
  '"series" OR "round" OR "co-invest" OR "commitment" OR "allocation"',
  '"pitch deck" OR "one-pager" OR "tearsheet" OR "investment memo" OR "term sheet"',
  '"kick off call" OR "introductory call"',
]

export async function POST(req: NextRequest) {
  const body = await req.json()
  const mode = body.mode as "baseline" | "label"

  if (!mode || !["baseline", "label"].includes(mode)) {
    return NextResponse.json({ error: 'mode must be "baseline" or "label"' }, { status: 400 })
  }

  try {
    if (mode === "baseline") {
      return await runBaselineScan()
    } else {
      return await runLabelScan()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function getExistingThreadIds(): Promise<Set<string>> {
  const supabase = createServerClient()
  const { data } = await supabase.from("acio_deal_emails").select("thread_id")
  const { data: deals } = await supabase.from("acio_deals").select("source_thread_id")
  const ids = new Set<string>()
  for (const row of data || []) ids.add(row.thread_id)
  for (const row of deals || []) if (row.source_thread_id) ids.add(row.source_thread_id)
  return ids
}

function isAllInternal(participants: { name: string; email: string }[]): boolean {
  return participants.every((p) =>
    INTERNAL_DOMAINS.some((d) => p.email.endsWith(`@${d}`))
  )
}

async function runBaselineScan() {
  const supabase = createServerClient()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const dateStr = `${threeMonthsAgo.getFullYear()}/${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}/${String(threeMonthsAgo.getDate()).padStart(2, "0")}`

  const allThreadIds = new Set<string>()
  for (const q of BASELINE_QUERIES) {
    const ids = await searchThreads(`${q} after:${dateStr}`)
    ids.forEach((id) => allThreadIds.add(id))
  }

  const existing = await getExistingThreadIds()
  const newThreadIds = [...allThreadIds].filter((id) => !existing.has(id))

  let newDeals = 0

  for (const threadId of newThreadIds) {
    const meta = await fetchThreadMeta(threadId)

    if (isAllInternal(meta.participants)) continue

    const classification = await classifyThread(meta)

    if (!classification.is_deal) continue

    const { data: deal } = await supabase
      .from("acio_deals")
      .insert({
        company_name: classification.company_name,
        deal_type: classification.deal_type,
        stage: classification.suggested_stage,
        status: "pending_review",
        source: "baseline_scan",
        source_thread_id: threadId,
        source_subject: meta.subject,
        key_contacts: classification.key_contacts,
      })
      .select()
      .single()

    if (deal) {
      await supabase.from("acio_deal_emails").insert({
        deal_id: deal.id,
        thread_id: threadId,
        subject: meta.subject,
        snippet: meta.snippet,
        last_message_date: meta.lastMessageDate,
        participants: meta.participants,
      })
      newDeals++
    }
  }

  await supabase.from("acio_scan_log").insert({
    scan_type: "baseline",
    threads_scanned: newThreadIds.length,
    new_deals_found: newDeals,
    query_used: BASELINE_QUERIES.join(" | "),
  })

  return NextResponse.json({
    scan_type: "baseline",
    threads_scanned: newThreadIds.length,
    new_deals_found: newDeals,
  })
}

async function runLabelScan() {
  const supabase = createServerClient()
  const labelId = process.env.GMAIL_ACIO_LABEL_ID
  if (!labelId) {
    return NextResponse.json({ error: "GMAIL_ACIO_LABEL_ID not configured" }, { status: 500 })
  }

  const { data: lastScan } = await supabase
    .from("acio_scan_log")
    .select("scanned_at")
    .eq("scan_type", "label")
    .order("scanned_at", { ascending: false })
    .limit(1)
    .single()

  let query = "label:ACIO-Opportunities"
  if (lastScan?.scanned_at) {
    const d = new Date(lastScan.scanned_at)
    const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
    query += ` after:${dateStr}`
  }

  const threadIds = await searchThreads(query)
  const existing = await getExistingThreadIds()
  const newThreadIds = threadIds.filter((id) => !existing.has(id))

  let newDeals = 0

  for (const threadId of newThreadIds) {
    const meta = await fetchThreadMeta(threadId)
    const extraction = await extractDealMetadata(meta)

    const { data: deal } = await supabase
      .from("acio_deals")
      .insert({
        company_name: extraction.company_name,
        deal_type: extraction.deal_type,
        stage: extraction.suggested_stage,
        status: "confirmed",
        source: "label",
        source_thread_id: threadId,
        source_subject: meta.subject,
        key_contacts: extraction.key_contacts,
      })
      .select()
      .single()

    if (deal) {
      await supabase.from("acio_deal_emails").insert({
        deal_id: deal.id,
        thread_id: threadId,
        subject: meta.subject,
        snippet: meta.snippet,
        last_message_date: meta.lastMessageDate,
        participants: meta.participants,
      })
      newDeals++
    }
  }

  await supabase.from("acio_scan_log").insert({
    scan_type: "label",
    threads_scanned: newThreadIds.length,
    new_deals_found: newDeals,
    query_used: query,
  })

  return NextResponse.json({
    scan_type: "label",
    threads_scanned: newThreadIds.length,
    new_deals_found: newDeals,
  })
}
