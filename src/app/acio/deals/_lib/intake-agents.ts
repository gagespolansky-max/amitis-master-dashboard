import Anthropic from "@anthropic-ai/sdk"
import type { ContentBlockParam, ToolUnion } from "@anthropic-ai/sdk/resources/messages"
import { z } from "zod"
import { extractTextFromResponse, safeParseAIResponse } from "@/lib/ai-parse"
import {
  fetchAttachmentData,
  fetchThreadMessages,
  type GmailClient,
  type ThreadMeta,
  type ThreadMessage,
} from "./gmail"
import { DealExtractionSchema } from "./types"
import type { DealExtraction } from "./classify"

const client = new Anthropic()

const INTAKE_MODEL = "claude-sonnet-4-20250514"
const MAX_AGENT_TOKENS = 1200
const MAX_SYNTHESIS_TOKENS = 1400
const MAX_EMAIL_BODY_CHARS = 12000
const MAX_TEXT_ATTACHMENT_CHARS = 30000
const MAX_PDF_BYTES = 12 * 1024 * 1024
const MAX_ATTACHMENTS_TO_READ = 6

const AgentReportSchema = z.object({
  agent: z.string(),
  summary: z.string(),
  fields: z.object({
    company_name: z.string().nullable().optional(),
    deal_type: z.enum(["fund_allocation", "co_invest", "direct"]).nullable().optional(),
    vehicle: z.enum(["spv", "direct_equity", "safe_convertible"]).nullable().optional(),
    company_stage: z.enum(["pre_seed", "seed", "series_a", "series_b", "series_c_plus"]).nullable().optional(),
    suggested_stage: z.enum(["sourced", "initial_call", "dd_in_progress", "ic_review", "committed", "passed"]).nullable().optional(),
    key_contacts: z.array(z.object({ name: z.string(), email: z.string(), role: z.string() })).nullable().optional(),
    industry: z.string().nullable().optional(),
    company_description: z.string().nullable().optional(),
    value_proposition: z.string().nullable().optional(),
  }).default({}),
  evidence: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
})

type AgentReport = z.infer<typeof AgentReportSchema>

type AttachmentForReview = {
  messageId: string
  attachmentId: string
  filename: string
  mimeType: string
  size: number
}

function parseReport(text: string, fallbackAgent: string): AgentReport {
  const parsed = safeParseAIResponse(text, AgentReportSchema)
  if (parsed.success) return parsed.data
  return {
    agent: fallbackAgent,
    summary: "Agent response could not be parsed.",
    fields: {},
    evidence: [],
    concerns: [parsed.error],
    confidence: 0,
  }
}

function failedReport(agent: string, err: unknown): AgentReport {
  return {
    agent,
    summary: `${agent} failed.`,
    fields: {},
    evidence: [],
    concerns: [err instanceof Error ? err.message : String(err)],
    confidence: 0,
  }
}

async function runOptionalAgent(agent: string, fn: () => Promise<AgentReport>): Promise<AgentReport> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[acio intake] ${agent} failed:`, err)
    return failedReport(agent, err)
  }
}

function compactMessages(messages: ThreadMessage[]) {
  return messages.map((m) => ({
    from: m.fromEmail,
    date: m.date,
    subject: m.subject,
    snippet: m.snippet,
    body: m.bodyText.slice(0, MAX_EMAIL_BODY_CHARS),
    attachments: m.attachments.map((a) => ({
      filename: a.filename,
      mimeType: a.mimeType,
      size: a.size,
    })),
  }))
}

function attachmentList(messages: ThreadMessage[]): AttachmentForReview[] {
  return messages
    .flatMap((m) =>
      m.attachments.map((a) => ({
        messageId: a.messageId,
        attachmentId: a.attachmentId,
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
      }))
    )
    .filter((a) => a.filename && a.attachmentId)
    .slice(0, MAX_ATTACHMENTS_TO_READ)
}

function isTextLikeAttachment(att: AttachmentForReview): boolean {
  const name = att.filename.toLowerCase()
  return (
    att.mimeType.startsWith("text/") ||
    att.mimeType.includes("json") ||
    att.mimeType.includes("csv") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv") ||
    name.endsWith(".json") ||
    name.endsWith(".html")
  )
}

function isPdfAttachment(att: AttachmentForReview): boolean {
  return att.mimeType === "application/pdf" || att.filename.toLowerCase().endsWith(".pdf")
}

async function runEmailThreadAgent(meta: ThreadMeta, messages: ThreadMessage[]): Promise<AgentReport> {
  const response = await client.messages.create({
    model: INTAKE_MODEL,
    max_tokens: MAX_AGENT_TOKENS,
    messages: [
      {
        role: "user",
        content: `You are the email-thread analyst for Amitis Capital's ACIO deal intake.

Read the full thread bodies and extract deal facts from the email evidence only. Do not use outside knowledge.

Return JSON only:
{
  "agent": "email_thread",
  "summary": "short factual summary",
  "fields": {
    "company_name": "...",
    "deal_type": "fund_allocation|co_invest|direct" or null,
    "vehicle": "spv|direct_equity|safe_convertible" or null,
    "company_stage": "pre_seed|seed|series_a|series_b|series_c_plus" or null,
    "suggested_stage": "sourced|initial_call|dd_in_progress|ic_review|committed|passed",
    "key_contacts": [{"name":"...","email":"...","role":"counterparty|internal|advisor"}],
    "industry": "...",
    "company_description": "...",
    "value_proposition": "..."
  },
  "evidence": ["short quote or email fact"],
  "concerns": ["missing info or ambiguity"],
  "confidence": 0.0
}

Stage rules:
- sourced: intro, pitch received, or first contact
- initial_call: call scheduled or just happened
- dd_in_progress: materials exchanged, multiple DD calls, data room access
- ic_review: IC memo, final decision, or investment committee references
- committed: terms agreed, subscription docs, closing
- passed: explicit pass or decline

Thread metadata:
${JSON.stringify(meta, null, 2)}

Full messages:
${JSON.stringify(compactMessages(messages), null, 2)}`,
      },
    ],
  })

  return parseReport(extractTextFromResponse(response), "email_thread")
}

async function buildAttachmentContent(gmail: GmailClient, attachments: AttachmentForReview[]) {
  const content: ContentBlockParam[] = []
  const manifest: unknown[] = []

  for (const att of attachments) {
    const manifestItem = {
      filename: att.filename,
      mimeType: att.mimeType,
      size: att.size,
      status: "metadata_only",
    }

    try {
      if (isPdfAttachment(att) && att.size <= MAX_PDF_BYTES) {
        const data = await fetchAttachmentData(gmail, att.messageId, att.attachmentId)
        content.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: data.toString("base64"),
          },
        })
        manifest.push({ ...manifestItem, status: "pdf_read_by_claude" })
        continue
      }

      if (isTextLikeAttachment(att)) {
        const data = await fetchAttachmentData(gmail, att.messageId, att.attachmentId)
        content.push({
          type: "text",
          text: `\n\nAttachment: ${att.filename}\nMIME: ${att.mimeType}\n\n${data
            .toString("utf8")
            .slice(0, MAX_TEXT_ATTACHMENT_CHARS)}`,
        })
        manifest.push({ ...manifestItem, status: "text_extracted" })
        continue
      }

      manifest.push({
        ...manifestItem,
        status: isPdfAttachment(att) ? "pdf_too_large" : "unsupported_file_type",
      })
    } catch (err) {
      manifest.push({
        ...manifestItem,
        status: "read_error",
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { content, manifest }
}

async function runAttachmentAgent(gmail: GmailClient, messages: ThreadMessage[]): Promise<AgentReport> {
  const attachments = attachmentList(messages)
  if (attachments.length === 0) {
    return {
      agent: "attachments",
      summary: "No readable attachments were present in the thread.",
      fields: {},
      evidence: [],
      concerns: [],
      confidence: 0,
    }
  }

  const { content, manifest } = await buildAttachmentContent(gmail, attachments)
  const response = await client.messages.create({
    model: INTAKE_MODEL,
    max_tokens: MAX_AGENT_TOKENS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are the attachment analyst for Amitis Capital's ACIO deal intake.

Read the supplied attachments and extract deal facts from attachments only. PDFs and text-like files may be provided inline. Unsupported files are listed in the manifest and should be noted as limitations, not inferred from.

Return JSON only with this shape:
{
  "agent": "attachments",
  "summary": "short factual summary",
  "fields": {
    "company_name": "...",
    "deal_type": "fund_allocation|co_invest|direct" or null,
    "vehicle": "spv|direct_equity|safe_convertible" or null,
    "company_stage": "pre_seed|seed|series_a|series_b|series_c_plus" or null,
    "suggested_stage": "sourced|initial_call|dd_in_progress|ic_review|committed|passed",
    "key_contacts": [{"name":"...","email":"...","role":"counterparty|internal|advisor"}],
    "industry": "...",
    "company_description": "...",
    "value_proposition": "..."
  },
  "evidence": ["short attachment fact or quote"],
  "concerns": ["missing info or unsupported files"],
  "confidence": 0.0
}

Attachment manifest:
${JSON.stringify(manifest, null, 2)}`,
          },
          ...content,
        ],
      },
    ],
  })

  return parseReport(extractTextFromResponse(response), "attachments")
}

async function runWebVerificationAgent(meta: ThreadMeta, emailReport: AgentReport): Promise<AgentReport> {
  const tools: ToolUnion[] = [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }]

  const response = await client.messages.create({
    model: INTAKE_MODEL,
    max_tokens: MAX_AGENT_TOKENS,
    tools,
    messages: [
      {
        role: "user",
        content: `You are the low-weight web verification analyst for Amitis Capital's ACIO deal intake.

Use web search only to check public facts about the company/fund, sector, website, public team/background, and obvious red flags. Many ACIO deals are off-market, so absence of public data is not negative evidence. Do not override email or attachment evidence unless public information directly contradicts it.

Return JSON only:
{
  "agent": "web_verification",
  "summary": "short public verification summary",
  "fields": {
    "company_name": "...",
    "industry": "...",
    "company_description": "...",
    "value_proposition": "..."
  },
  "evidence": ["source title/url and short fact"],
  "concerns": ["contradictions, no public footprint, or ambiguity"],
  "confidence": 0.0
}

Thread metadata:
${JSON.stringify(meta, null, 2)}

Email analyst report:
${JSON.stringify(emailReport, null, 2)}`,
      },
    ],
  })

  return parseReport(extractTextFromResponse(response), "web_verification")
}

async function synthesizeDealExtraction(reports: AgentReport[]): Promise<DealExtraction> {
  const response = await client.messages.create({
    model: INTAKE_MODEL,
    max_tokens: MAX_SYNTHESIS_TOKENS,
    messages: [
      {
        role: "user",
        content: `You are the lead ACIO intake analyst. Synthesize the sub-agent reports into the final Supabase deal fields.

Weight evidence in this order:
1. Email thread bodies: highest weight for actual transaction status and relationship context.
2. Attachments: high weight for company/fund details, strategy, terms, AUM, stage, and materials.
3. Web verification: lowest weight. Use it only for public verification, context, and red flags because many opportunities are off-market.

Resolve conflicts conservatively. If a field is uncertain, use null rather than guessing. Keep value_proposition specific to Amitis as an alternatives allocator/family-office style investor.

Return JSON only:
{
  "company_name": "the company or fund being evaluated",
  "deal_type": "fund_allocation|co_invest|direct" or null,
  "vehicle": "spv|direct_equity|safe_convertible" or null,
  "company_stage": "pre_seed|seed|series_a|series_b|series_c_plus" or null,
  "suggested_stage": "sourced|initial_call|dd_in_progress|ic_review|committed|passed",
  "key_contacts": [{"name": "...", "email": "...", "role": "counterparty|internal|advisor"}],
  "industry": "sector/industry",
  "company_description": "1-2 sentence description",
  "value_proposition": "1 sentence on why this is relevant to Amitis Capital"
}

Sub-agent reports:
${JSON.stringify(reports, null, 2)}`,
      },
    ],
  })

  const text = extractTextFromResponse(response)
  const result = safeParseAIResponse(text, DealExtractionSchema)
  if (!result.success) {
    throw new Error(`Failed to parse intake synthesis response: ${result.error}`)
  }
  return result.data
}

export async function extractDealMetadataWithAgents(
  gmail: GmailClient,
  meta: ThreadMeta
): Promise<DealExtraction> {
  const messages = await fetchThreadMessages(gmail, meta.threadId)
  const emailReport = await runEmailThreadAgent(meta, messages)
  const [attachmentReport, webReport] = await Promise.all([
    runOptionalAgent("attachments", () => runAttachmentAgent(gmail, messages)),
    runOptionalAgent("web_verification", () => runWebVerificationAgent(meta, emailReport)),
  ])
  return synthesizeDealExtraction([emailReport, attachmentReport, webReport])
}
