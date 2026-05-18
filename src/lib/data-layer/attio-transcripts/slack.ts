import { knownPersonNameForEmail } from "./identity"
import type { SlackCallSummary, TranscriptAnalysis } from "./llm"
import type { NormalizedTranscript } from "./types"

const MAX_SLACK_TEXT_CHARS = 8_000
const MAX_LIST_ITEMS = 6

interface SlackPostMessageResponse {
  ok: boolean
  ts?: string
  error?: string
}

interface SlackTranscriptNotificationInput {
  callId: string
  normalized: NormalizedTranscript
  summary: SlackCallSummary
  labels: string[]
  analysisPeople: TranscriptAnalysis["people"]
  externalParticipants: Array<{
    display_name: string | null
    email: string | null
    firm_name: string | null
    company_identity_id: string | null
    person_identity_id: string | null
    participant_identity_id: string | null
    inferred_role?: string | null
  }>
  observationsAdded: number
  profilesUpdated: number
}

export function isAttioTranscriptSlackConfigured(): boolean {
  return Boolean(process.env.ATTIO_TRANSCRIPT_SLACK_BOT_TOKEN && process.env.ATTIO_TRANSCRIPT_SLACK_CHANNEL_ID)
}

export async function notifyAttioTranscriptSlack(input: SlackTranscriptNotificationInput): Promise<string | null> {
  if (!isAttioTranscriptSlackConfigured()) return null

  const token = process.env.ATTIO_TRANSCRIPT_SLACK_BOT_TOKEN
  const channel = process.env.ATTIO_TRANSCRIPT_SLACK_CHANNEL_ID
  if (!token || !channel) return null

  const text = formatAttioTranscriptSlackMessage(input)
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel,
      text,
      mrkdwn: true,
      unfurl_links: false,
      unfurl_media: false,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as SlackPostMessageResponse
  if (!response.ok || !payload.ok || !payload.ts) {
    throw new Error(`Slack chat.postMessage failed: ${payload.error ?? response.statusText}`)
  }

  return payload.ts
}

export function formatAttioTranscriptSlackMessage(input: SlackTranscriptNotificationInput): string {
  const title = input.normalized.title ?? "Untitled Attio call"
  const callDate = formatSlackDate(input.normalized.callDate)
  const type = input.summary.call_type.replace(/_/g, " ")
  const labels = input.labels.length ? input.labels.map((label) => `\`${slackEscape(label)}\``).join(" ") : "_none_"
  const reviewUrl = getReviewUrl()
  const sourceUrl = input.normalized.sourceUrl

  const sections = [
    `*New Attio call ready for review*`,
    `*${slackEscape(title)}*`,
    [
      `*Type:* ${slackEscape(type)}`,
      `*Sentiment:* ${slackEscape(input.summary.sentiment)}`,
      `*Date:* ${callDate}`,
    ].join(" | "),
    formatExternalCounterparties(input.externalParticipants, input.summary.counterparty, input.analysisPeople),
    formatInternalParticipants(input.normalized.participants, input.analysisPeople),
    `*Labels:* ${labels}`,
    formatCallRecap(input.summary),
    formatSlackList("Action items", input.summary.action_items),
    formatSlackList("Key points", input.summary.key_points),
    formatSlackList("Open questions", input.summary.open_questions),
    formatSlackList("Risks", input.summary.risks),
    formatSlackList("Relationship signals", input.summary.relationship_signals),
    `*Memory written:* ${input.observationsAdded} observation${input.observationsAdded === 1 ? "" : "s"}, ${input.profilesUpdated} profile${input.profilesUpdated === 1 ? "" : "s"} updated`,
    formatLinks({ reviewUrl, sourceUrl, callId: input.callId }),
  ].filter(Boolean)

  return truncateSlackText(sections.join("\n\n"))
}

function formatExternalCounterparties(
  externalParticipants: SlackTranscriptNotificationInput["externalParticipants"],
  summaryCounterparty: string | null,
  analysisPeople: TranscriptAnalysis["people"],
): string {
  if (externalParticipants.length === 0) return "*External counterparties*\n_none detected_"

  const companies = new Map<string, typeof externalParticipants>()
  for (const participant of externalParticipants) {
    const key = participant.company_identity_id ?? participant.email?.split("@").pop()?.toLowerCase() ?? "company:unknown"
    const existing = companies.get(key) ?? []
    existing.push(participant)
    companies.set(key, existing)
  }

  const lines = [...companies.entries()].slice(0, MAX_LIST_ITEMS).flatMap(([companyId, participants]) => {
    const companyName = summaryCounterparty ?? participants.find((p) => p.firm_name)?.firm_name ?? participants[0]?.email?.split("@").pop() ?? "Unknown company"
    const personLines = participants.slice(0, 4).map((participant) => {
      const name = realNameForParticipant(participant, analysisPeople)
      const personId = participant.person_identity_id ?? "person:unknown"
      const compositeId = participant.participant_identity_id ?? "participant:unknown"
      return `  • ${slackEscape(name)} — person \`${slackEscape(personId)}\`; pair \`${slackEscape(compositeId)}\``
    })
    return [
      `• ${slackEscape(companyName)} — company \`${slackEscape(companyId)}\``,
      ...personLines,
    ]
  })

  return `*External counterparties*\n${lines.join("\n")}`
}

function formatInternalParticipants(
  participants: NormalizedTranscript["participants"],
  analysisPeople: TranscriptAnalysis["people"],
): string {
  const internalParticipants = participants.filter((participant) => participant.inferred_role === "internal")
  if (internalParticipants.length === 0) return ""
  const lines = internalParticipants.slice(0, MAX_LIST_ITEMS).map((participant) => {
    const name = realNameForParticipant(participant, analysisPeople)
    return `• ${slackEscape(name)} — person \`${slackEscape(participant.person_identity_id)}\``
  })
  const omitted = internalParticipants.length > lines.length ? `\n_${internalParticipants.length - lines.length} more omitted._` : ""
  return `*Amitis participants*\n${lines.join("\n")}${omitted}`
}

function formatCallRecap(summary: SlackCallSummary): string {
  const sections = summary.call_recap_sections
    .map((section) => ({
      title: section.title.trim(),
      body: section.body.trim(),
    }))
    .filter((section) => section.title && section.body)

  if (sections.length === 0) return `*Call recap*\n${slackEscape(summary.tldr)}`

  return [
    "*Call recap*",
    ...sections.slice(0, 5).map((section) => `*${slackEscape(section.title)}*\n${slackEscape(section.body)}`),
  ].join("\n\n")
}

function realNameForParticipant(
  participant: { display_name: string | null; email: string | null },
  analysisPeople: TranscriptAnalysis["people"],
): string {
  const email = participant.email?.toLowerCase()
  const knownName = knownPersonNameForEmail(email)
  if (knownName) return knownName
  const person = email ? analysisPeople.find((p) => p.email?.toLowerCase() === email) : null
  return person?.name || participant.display_name || participant.email || "Unknown person"
}

function formatSlackList(title: string, values: string[]): string {
  const items = uniqueStrings(values).slice(0, MAX_LIST_ITEMS)
  if (items.length === 0) return ""
  const omitted = values.length > items.length ? `\n_${values.length - items.length} more omitted._` : ""
  return `*${title}*\n${items.map((item) => `• ${slackEscape(item)}`).join("\n")}${omitted}`
}

function formatLinks(args: { reviewUrl: string | null; sourceUrl: string | null; callId: string }): string {
  const links = [
    args.reviewUrl ? `<${slackLinkUrl(args.reviewUrl)}|Open review queue>` : null,
    args.sourceUrl ? `<${slackLinkUrl(args.sourceUrl)}|Open Attio call>` : null,
  ].filter((value): value is string => Boolean(value))

  const linkText = links.length ? links.join(" | ") : "_No links configured_"
  return `*Review:* ${linkText}\n_Call ID: \`${slackEscape(args.callId)}\`_`
}

function getReviewUrl(): string | null {
  const explicit = process.env.ATTIO_TRANSCRIPT_REVIEW_URL
  if (explicit) return explicit

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  if (!baseUrl) return null
  return new URL("/data-layer/attio-transcripts/review", baseUrl).toString()
}

function formatSlackDate(value: string): string {
  const timestamp = Math.floor(new Date(value).getTime() / 1000)
  if (!Number.isFinite(timestamp)) return slackEscape(value)
  return `<!date^${timestamp}^{date_short_pretty} {time}|${slackEscape(value)}>`
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const normalized = value?.trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
  }
  return out
}

function truncateSlackText(text: string): string {
  if (text.length <= MAX_SLACK_TEXT_CHARS) return text
  return `${text.slice(0, MAX_SLACK_TEXT_CHARS - 80).trim()}\n\n_Response truncated for Slack._`
}

function slackEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function slackLinkUrl(value: string): string {
  return value.replace(/>/g, "%3E")
}
