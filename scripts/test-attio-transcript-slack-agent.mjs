#!/usr/bin/env node
import fs from "node:fs"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

const SLACK_SUMMARY_PROMPT_VERSION = "attio-transcript-slack-summary-v1"
const TRANSCRIPT_MODEL = "claude-sonnet-4-20250514"
const CALL_LAB_AGENT_PATH = "src/lib/data-layer/attio-transcripts/agents/call-lab-agent.md"
const CALL_RECAP_SKILL_PATH = "src/lib/data-layer/attio-transcripts/agents/skills/call-recap-skill.md"
const KNOWN_PERSON_NAMES_BY_EMAIL = {
  "aabdulali@amitiscapital.com": "Adil Abdulali",
  "afeldheim@amitiscapital.com": "Adam Feldheim",
  "csolarz@amitiscapital.com": "Chris Solarz",
  "gspolansky@amitiscapital.com": "Gage Spolansky",
  "jpgonzalez@amitiscapital.com": "JP Gonzalez",
  "lzou@amitiscapital.com": "Leyu Zou",
  "mmonajem@amitiscapital.com": "MM",
}

const SlackCallSummarySchema = z.object({
  headline: z.string(),
  call_type: z.enum([
    "lp_update",
    "manager_update",
    "diligence",
    "intro",
    "portfolio",
    "ops",
    "other",
  ]),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed", "unknown"]).default("unknown"),
  counterparty: z.string().nullable().default(null),
  tldr: z.string(),
  call_recap_sections: z.array(z.object({
    title: z.string(),
    body: z.string(),
  })).default([]),
  action_items: z.array(z.string()).default([]),
  key_points: z.array(z.string()).default([]),
  open_questions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  relationship_signals: z.array(z.string()).default([]),
})
const SlackSummaryShellSchema = SlackCallSummarySchema.omit({ call_recap_sections: true })
const CallRecapSkillOutputSchema = z.object({
  call_recap_sections: z.array(z.object({
    title: z.string(),
    body: z.string(),
  })).default([]),
})

function loadDotEnv(path) {
  if (!path || !fs.existsSync(path)) return {}
  const env = {}
  for (const rawLine of fs.readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const equalsIndex = line.indexOf("=")
    if (equalsIndex === -1) continue
    const key = line.slice(0, equalsIndex).trim()
    let value = line.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function getArg(name) {
  const prefix = `${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : null
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var ${name}`)
  return value
}

function applyEnv(env) {
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue
    process.env[key] = value
  }
}

function extractTextFromAnthropicResponse(response) {
  return response.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim()
}

function parseJsonObject(text) {
  const direct = tryJson(text)
  if (direct) return direct
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  if (fenced) {
    const parsed = tryJson(fenced)
    if (parsed) return parsed
  }
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start !== -1 && end > start) {
    const parsed = tryJson(text.slice(start, end + 1))
    if (parsed) return parsed
  }
  throw new Error("Could not parse Slack summary JSON")
}

function tryJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function fetchTranscript(env, transcriptId) {
  const url = new URL("/rest/v1/call_transcripts", env.NEXT_PUBLIC_SUPABASE_URL)
  url.searchParams.set(
    "select",
    "id,title,status,call_date,labels,summary,classification,source_url,raw_transcript,transcript_segments,participants:call_participants(display_name,email,firm_name,inferred_role,company_identity_id,person_identity_id,participant_identity_id)",
  )
  url.searchParams.set("order", "call_date.desc")
  url.searchParams.set("limit", "1")
  if (transcriptId) {
    url.searchParams.set("id", `eq.${transcriptId}`)
  } else {
    url.searchParams.set("status", "eq.reviewed")
  }

  const response = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(`Supabase transcript query failed: ${payload?.message ?? response.statusText}`)
  const row = payload?.[0]
  if (!row) throw new Error("No matching transcript found")
  return row
}

async function summarizeForSlack(transcript) {
  const anthropic = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") })
  const agentContract = fs.readFileSync(CALL_LAB_AGENT_PATH, "utf8")
  const recapSkill = fs.readFileSync(CALL_RECAP_SKILL_PATH, "utf8")
  const shell = await draftSlackSummaryShell(anthropic, transcript, agentContract)
  const recap = await draftCallRecapSections(anthropic, transcript, agentContract, recapSkill, shell.parsed)
  return {
    parsed: SlackCallSummarySchema.parse({
      ...shell.parsed,
      call_recap_sections: recap.parsed.call_recap_sections,
    }),
    rawText: JSON.stringify({
      summary_shell: shell.rawText,
      call_recap_skill: recap.rawText,
    }),
    usage: {
      input_tokens: sumNullable(shell.usage.input_tokens ?? null, recap.usage.input_tokens ?? null),
      output_tokens: sumNullable(shell.usage.output_tokens ?? null, recap.usage.output_tokens ?? null),
    },
  }
}

async function draftSlackSummaryShell(anthropic, transcript, agentContract) {
  const response = await anthropic.messages.create({
    model: TRANSCRIPT_MODEL,
    max_tokens: 1000,
    system: `You are running this agent contract:

${agentContract}

Runtime rules:
- Produce the parent Slack summary shell only.
- Do not produce call_recap_sections in this step.
- Use only the supplied structured analysis and participant metadata.
- Do not invent action items, dates, names, amounts, risks, or commitments.
- Preserve the call category and sentiment unless the supplied analysis is clearly inconsistent.
- Return JSON only. No markdown.`,
    messages: [
      {
        role: "user",
        content: `Create the Slack summary shell.

Return this JSON shape exactly:
{
  "headline": "short Slack headline",
  "call_type": "lp_update|manager_update|diligence|intro|portfolio|ops|other",
  "sentiment": "positive|neutral|negative|mixed|unknown",
  "counterparty": "external firm/person if clear, otherwise null",
  "tldr": "one-sentence fallback recap",
  "action_items": ["explicit next steps / asks / follow-ups only"],
  "key_points": ["most important facts"],
  "open_questions": ["unresolved questions"],
  "risks": ["risks only if grounded"],
  "relationship_signals": ["relationship signals only if grounded"]
}

Meeting title: ${transcript.title ?? "(untitled)"}
Call date: ${transcript.call_date}
Participants: ${JSON.stringify(transcript.participants ?? [])}
Structured analysis: ${JSON.stringify({
  ...(transcript.classification ?? {}),
  labels: transcript.labels ?? [],
  summary: transcript.summary ?? {},
})}`,
      },
    ],
  })
  const rawText = extractTextFromAnthropicResponse(response)
  const parsed = SlackSummaryShellSchema.parse(parseJsonObject(rawText))
  return {
    parsed,
    rawText,
    usage: response.usage,
  }
}

async function draftCallRecapSections(anthropic, transcript, agentContract, recapSkill, shell) {
  const response = await anthropic.messages.create({
    model: TRANSCRIPT_MODEL,
    max_tokens: 1400,
    system: `You are running this agent contract:

${agentContract}

You are now invoking this sub-skill for the recap section only:

${recapSkill}

Runtime rules:
- Return only the Call Recap Skill JSON output.
- Do not produce headline, action_items, key_points, open_questions, risks, or relationship_signals.
- Use the transcript to understand sequence and substance.
- Use sibling sections only to avoid duplicating them.
- If the call has no real substance, return {"call_recap_sections":[]}.
- Return JSON only. No markdown.`,
    messages: [
      {
        role: "user",
        content: `Invoke the Call Recap Skill for this call.

Return this JSON shape exactly:
{
  "call_recap_sections": [
    {
      "title": "Short, specific section title",
      "body": "2-4 sentences describing what was discussed in this part of the call."
    }
  ]
}

Meeting title: ${transcript.title ?? "(untitled)"}
Call date: ${transcript.call_date}
Participants: ${JSON.stringify(transcript.participants ?? [])}

Sibling sections already drafted by parent agent. Do not repeat these in prose:
${JSON.stringify({
  action_items: shell.action_items,
  key_points: shell.key_points,
  open_questions: shell.open_questions,
  risks: shell.risks,
  relationship_signals: shell.relationship_signals,
})}

Structured analysis:
${JSON.stringify({
  ...(transcript.classification ?? {}),
  labels: transcript.labels ?? [],
  summary: transcript.summary ?? {},
})}

Transcript:
${transcriptText(transcript).slice(0, 80_000)}`,
      },
    ],
  })
  const rawText = extractTextFromAnthropicResponse(response)
  const parsed = CallRecapSkillOutputSchema.parse(parseJsonObject(rawText))
  return {
    parsed,
    rawText,
    usage: response.usage,
  }
}

function transcriptText(transcript) {
  if (transcript.raw_transcript) return transcript.raw_transcript
  return (transcript.transcript_segments ?? [])
    .map((segment) => {
      const speaker = segment.speaker_name ? `${segment.speaker_name}: ` : ""
      return `${speaker}${segment.speech ?? ""}`.trim()
    })
    .filter(Boolean)
    .join("\n")
}

function sumNullable(...values) {
  let total = 0
  for (const value of values) {
    if (typeof value !== "number") return null
    total += value
  }
  return total
}

function formatSlackDate(value) {
  const timestamp = Math.floor(new Date(value).getTime() / 1000)
  if (!Number.isFinite(timestamp)) return slackEscape(value)
  return `<!date^${timestamp}^{date_short_pretty} {time}|${slackEscape(value)}>`
}

function uniqueStrings(values) {
  const seen = new Set()
  const out = []
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

function formatSlackList(title, values) {
  const items = uniqueStrings(values).slice(0, 6)
  if (items.length === 0) return ""
  return `*${title}*\n${items.map((item) => `• ${slackEscape(item)}`).join("\n")}`
}

function formatExternalCounterparties(participants, summaryCounterparty, analysisPeople) {
  const external = (participants ?? []).filter((p) => p.inferred_role !== "internal")
  if (external.length === 0) return "*External counterparties*\n_none detected_"
  const companies = new Map()
  for (const participant of external) {
    const key = participant.company_identity_id ?? participant.email?.split("@").pop()?.toLowerCase() ?? "company:unknown"
    const existing = companies.get(key) ?? []
    existing.push(participant)
    companies.set(key, existing)
  }
  const lines = [...companies.entries()].slice(0, 6).flatMap(([companyId, companyParticipants]) => {
    const companyName = summaryCounterparty ?? companyParticipants.find((p) => p.firm_name)?.firm_name ?? companyParticipants[0]?.email?.split("@").pop() ?? "Unknown company"
    return [
      `• ${slackEscape(companyName)} — company \`${slackEscape(companyId)}\``,
      ...companyParticipants.slice(0, 4).map((participant) => {
        const name = realNameForParticipant(participant, analysisPeople)
        const personId = participant.person_identity_id ?? "person:unknown"
        const pairId = participant.participant_identity_id ?? "participant:unknown"
        return `  • ${slackEscape(name)} — person \`${slackEscape(personId)}\`; pair \`${slackEscape(pairId)}\``
      }),
    ]
  })
  return `*External counterparties*\n${lines.join("\n")}`
}

function formatInternalParticipants(participants, analysisPeople) {
  const internal = (participants ?? []).filter((p) => p.inferred_role === "internal")
  if (internal.length === 0) return ""
  return `*Amitis participants*\n${internal.slice(0, 6).map((participant) => {
    const name = realNameForParticipant(participant, analysisPeople)
    const personId = participant.person_identity_id ?? "person:unknown"
    return `• ${slackEscape(name)} — person \`${slackEscape(personId)}\``
  }).join("\n")}`
}

function realNameForParticipant(participant, analysisPeople) {
  const email = participant.email?.toLowerCase()
  const knownName = email ? KNOWN_PERSON_NAMES_BY_EMAIL[email] : null
  if (knownName) return knownName
  const person = email ? analysisPeople.find((p) => p.email?.toLowerCase() === email) : null
  return person?.name || participant.display_name || participant.email || "Unknown person"
}

function formatCallRecap(summary) {
  const sections = (summary.call_recap_sections ?? [])
    .map((section) => ({
      title: String(section.title ?? "").trim(),
      body: String(section.body ?? "").trim(),
    }))
    .filter((section) => section.title && section.body)
  if (sections.length === 0) return `*Call recap*\n${slackEscape(summary.tldr)}`
  return [
    "*Call recap*",
    ...sections.slice(0, 5).map((section) => `*${slackEscape(section.title)}*\n${slackEscape(section.body)}`),
  ].join("\n\n")
}

function formatSlackMessage(transcript, summary) {
  const labels = (transcript.labels ?? []).length
    ? transcript.labels.map((label) => `\`${slackEscape(label)}\``).join(" ")
    : "_none_"
  const analysisPeople = transcript.classification?.people ?? []
  const reviewUrl = process.env.ATTIO_TRANSCRIPT_REVIEW_URL
  const links = [
    reviewUrl ? `<${reviewUrl.replace(/>/g, "%3E")}|Open review queue>` : null,
    transcript.source_url ? `<${transcript.source_url.replace(/>/g, "%3E")}|Open Attio call>` : null,
  ].filter(Boolean)
  const sections = [
    `*Test: Attio Slack Summary Agent*`,
    `*${slackEscape(summary.headline)}*`,
    [
      `*Type:* ${slackEscape(summary.call_type.replace(/_/g, " "))}`,
      `*Sentiment:* ${slackEscape(summary.sentiment)}`,
      `*Date:* ${formatSlackDate(transcript.call_date)}`,
    ].join(" | "),
    formatExternalCounterparties(transcript.participants, summary.counterparty, analysisPeople),
    formatInternalParticipants(transcript.participants, analysisPeople),
    `*Labels:* ${labels}`,
    formatCallRecap(summary),
    formatSlackList("Action items", summary.action_items),
    formatSlackList("Key points", summary.key_points),
    formatSlackList("Open questions", summary.open_questions),
    formatSlackList("Risks", summary.risks),
    formatSlackList("Relationship signals", summary.relationship_signals),
    `*Review:* ${links.length ? links.join(" | ") : "_No links configured_"}\n_Call ID: \`${slackEscape(transcript.id)}\`_`,
    `_Prompt: \`${SLACK_SUMMARY_PROMPT_VERSION}\`_`,
  ].filter(Boolean)
  return sections.join("\n\n").slice(0, 8_000)
}

async function postSlack(text) {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      authorization: `Bearer ${requireEnv("ATTIO_TRANSCRIPT_SLACK_BOT_TOKEN")}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: requireEnv("ATTIO_TRANSCRIPT_SLACK_CHANNEL_ID"),
      text,
      mrkdwn: true,
      unfurl_links: false,
      unfurl_media: false,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.ok || !payload.ts) {
    throw new Error(`Slack chat.postMessage failed: ${payload.error ?? response.statusText}`)
  }
  return payload.ts
}

function slackEscape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

async function main() {
  applyEnv(loadDotEnv(".env.local"))
  applyEnv(loadDotEnv(getArg("--env-file")))

  const env = process.env
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
  ]) {
    requireEnv(key)
  }
  if (!hasFlag("--dry-run")) {
    requireEnv("ATTIO_TRANSCRIPT_SLACK_BOT_TOKEN")
    requireEnv("ATTIO_TRANSCRIPT_SLACK_CHANNEL_ID")
  }

  const transcript = await fetchTranscript(env, getArg("--transcript-id"))
  const summary = await summarizeForSlack(transcript)
  const text = formatSlackMessage(transcript, summary.parsed)

  if (hasFlag("--dry-run")) {
    console.log(text)
    console.log(`\ninput_tokens=${summary.usage.input_tokens ?? "unknown"} output_tokens=${summary.usage.output_tokens ?? "unknown"}`)
    return
  }

  const ts = await postSlack(text)
  console.log(`posted=true channel=${process.env.ATTIO_TRANSCRIPT_SLACK_CHANNEL_ID} ts=${ts}`)
  console.log(`input_tokens=${summary.usage.input_tokens ?? "unknown"} output_tokens=${summary.usage.output_tokens ?? "unknown"}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
