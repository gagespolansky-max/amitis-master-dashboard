import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import {
  searchThreads,
  fetchThreadMeta,
  getGmailClientForUser,
  type GmailClient,
} from "@/app/acio/deals/_lib/gmail"
import { classifyThread, extractDealMetadata } from "@/app/acio/deals/_lib/classify"
import { findMatchingDeal, linkThreadToExistingDeal, type ExistingDeal } from "@/app/acio/deals/_lib/dedup"
import { requireUser } from "@/lib/auth"

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
    const user = await requireUser()
    const gmail = await getGmailClientForUser(user.id)

    if (mode === "baseline") {
      return await runBaselineScan(gmail, user.id)
    } else {
      return await runLabelScan(gmail, user.id)
    }
  } catch (err) {
    if (err instanceof Response) return err
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

async function runBaselineScan(gmail: GmailClient, userId: string) {
  const supabase = createServerClient()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const dateStr = `${threeMonthsAgo.getFullYear()}/${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}/${String(threeMonthsAgo.getDate()).padStart(2, "0")}`

  const allThreadIds = new Set<string>()
  for (const q of BASELINE_QUERIES) {
    const ids = await searchThreads(gmail, `${q} after:${dateStr}`)
    ids.forEach((id) => allThreadIds.add(id))
  }

  const existing = await getExistingThreadIds()
  const newThreadIds = [...allThreadIds].filter((id) => !existing.has(id))

  // Fetch all existing deals for dedup matching
  const { data: existingDealsRaw } = await supabase
    .from("acio_deals")
    .select("id, company_name, updated_at")
    .not("status", "eq", "dismissed")
  const existingDeals: ExistingDeal[] = existingDealsRaw || []

  let newDeals = 0
  let mergedIntoExisting = 0

  for (const threadId of newThreadIds) {
    const meta = await fetchThreadMeta(gmail, threadId)

    if (isAllInternal(meta.participants)) continue

    const classification = await classifyThread(meta)

    if (!classification.is_deal) continue

    // Check for existing deal match before inserting
    const match = await findMatchingDeal(classification.company_name, existingDeals)
    if (match) {
      await linkThreadToExistingDeal(match.dealId, classification, meta, supabase)
      mergedIntoExisting++
      continue
    }

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
        industry: classification.industry || null,
        vehicle: classification.vehicle || null,
        company_stage: classification.company_stage || null,
        company_description: classification.company_description || null,
        value_proposition: classification.value_proposition || null,
        created_by_user_id: userId,
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
      // Add to existingDeals so subsequent threads in this scan can match
      existingDeals.push({ id: deal.id, company_name: deal.company_name, updated_at: deal.updated_at })
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
    merged_into_existing: mergedIntoExisting,
  })
}

async function runLabelScan(gmail: GmailClient, userId: string) {
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

  const threadIds = await searchThreads(gmail, query)
  const existing = await getExistingThreadIds()
  const newThreadIds = threadIds.filter((id) => !existing.has(id))

  // Fetch all existing deals for dedup matching
  const { data: existingDealsRaw } = await supabase
    .from("acio_deals")
    .select("id, company_name, updated_at")
    .not("status", "eq", "dismissed")
  const existingDeals: ExistingDeal[] = existingDealsRaw || []

  let newDeals = 0
  let mergedIntoExisting = 0

  for (const threadId of newThreadIds) {
    const meta = await fetchThreadMeta(gmail, threadId)
    const extraction = await extractDealMetadata(meta)

    // Check for existing deal match before inserting
    const match = await findMatchingDeal(extraction.company_name, existingDeals)
    if (match) {
      await linkThreadToExistingDeal(match.dealId, extraction, meta, supabase)
      mergedIntoExisting++
      continue
    }

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
        industry: extraction.industry || null,
        vehicle: extraction.vehicle || null,
        company_stage: extraction.company_stage || null,
        company_description: extraction.company_description || null,
        value_proposition: extraction.value_proposition || null,
        created_by_user_id: userId,
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
      // Add to existingDeals so subsequent threads in this scan can match
      existingDeals.push({ id: deal.id, company_name: deal.company_name, updated_at: deal.updated_at })
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
    merged_into_existing: mergedIntoExisting,
  })
}
