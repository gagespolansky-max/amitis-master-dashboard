import { NextResponse } from "next/server"
import { requireAgentAccess } from "@/lib/agent-auth"
import {
  readActionItems,
  readInteractions,
  readAuditFindings,
} from "@/app/oig/_shared/db"

export const runtime = "nodejs"

const AGENT_SLUG = "chief-of-staff"

/**
 * GET /oig/cos/api/meeting-context?emails=a@b.com,c@d.com&domain=example.com
 *
 * Pulls the OIG context relevant to a single calendar event:
 *  - open action items where owner/requested-by matches one of the attendees
 *    or where the linked org matches the inferred org name
 *  - recent interactions matching attendee emails (last 90 days)
 *  - unresolved audit findings related to those people/orgs
 */
export async function GET(req: Request) {
  let user
  try {
    user = await requireAgentAccess(AGENT_SLUG)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
  void user // not currently used; access check is the gate

  const url = new URL(req.url)
  const emailsRaw = url.searchParams.get("emails") ?? ""
  const orgDomain = url.searchParams.get("domain") ?? ""

  const emails = emailsRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("@") && !s.endsWith("@amitiscapital.com"))

  // Pull a wider net then filter client-side (cheap; rows are small).
  const [allOpen, allInteractions, allFindings] = await Promise.all([
    readActionItems({ status: "open_or_in_progress", limit: 200 }),
    readInteractions({ days_back: 90, limit: 100 }),
    readAuditFindings({ unresolved_only: true, limit: 100 }),
  ])

  const emailSet = new Set(emails)

  const actionItems = allOpen.filter((a) => {
    const owner = a.owner_email?.toLowerCase() ?? ""
    const reqBy = a.requested_by_email?.toLowerCase() ?? ""
    if (emailSet.has(owner) || emailSet.has(reqBy)) return true
    if (orgDomain && a.organization_name) {
      // weak — only match when org_name itself contains the domain stem
      const stem = orgDomain.split(".")[0]
      if (a.organization_name.toLowerCase().includes(stem)) return true
    }
    return false
  })

  const interactions = allInteractions.filter((i) => {
    const e = i.primary_person_email?.toLowerCase() ?? ""
    if (emailSet.has(e)) return true
    if (orgDomain && i.organization_name) {
      const stem = orgDomain.split(".")[0]
      if (i.organization_name.toLowerCase().includes(stem)) return true
    }
    return false
  })

  const personSet = new Set(
    [
      ...actionItems.map((a) => a.owner_name).filter(Boolean),
      ...actionItems.map((a) => a.requested_by_name).filter(Boolean),
      ...interactions.map((i) => i.primary_person_name).filter(Boolean),
    ].map((s) => (s as string).toLowerCase()),
  )
  const orgSet = new Set(
    [
      ...actionItems.map((a) => a.organization_name).filter(Boolean),
      ...interactions.map((i) => i.organization_name).filter(Boolean),
    ].map((s) => (s as string).toLowerCase()),
  )

  const findings = allFindings.filter((f) => {
    if (f.related_person_name && personSet.has(f.related_person_name.toLowerCase())) return true
    if (f.related_org_name && orgSet.has(f.related_org_name.toLowerCase())) return true
    return false
  })

  return NextResponse.json({
    action_items: actionItems,
    interactions,
    findings,
    counts: {
      action_items: actionItems.length,
      interactions: interactions.length,
      findings: findings.length,
    },
  })
}
