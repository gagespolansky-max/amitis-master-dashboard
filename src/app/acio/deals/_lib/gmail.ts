import { google, gmail_v1 } from "googleapis"
import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"

export type GmailClient = gmail_v1.Gmail

/**
 * Build a Gmail client for a specific user using their stored refresh token.
 * Throws if the user has no credentials (they must sign in again).
 */
export async function getGmailClientForUser(userId: string): Promise<GmailClient> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("user_gmail_credentials")
    .select("refresh_token")
    .eq("user_id", userId)
    .single()

  if (error || !data?.refresh_token) {
    throw new Error(
      `No Gmail credentials for user ${userId}. Sign in again to reconnect Gmail.`
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  )
  oauth2Client.setCredentials({ refresh_token: data.refresh_token })
  return google.gmail({ version: "v1", auth: oauth2Client })
}

export interface ThreadMeta {
  threadId: string
  subject: string
  snippet: string
  lastMessageDate: string
  participants: { name: string; email: string }[]
  messageCount: number
  bodyPreview: string
}

export async function fetchThreadMeta(gmail: GmailClient, threadId: string): Promise<ThreadMeta> {
  const thread = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["From", "To", "Cc", "Subject", "Date"],
  })

  const messages = thread.data.messages || []
  const participants = new Map<string, { name: string; email: string }>()
  let subject = ""
  let lastDate = ""

  for (const msg of messages) {
    const headers = msg.payload?.headers || []
    for (const h of headers) {
      if (h.name === "Subject" && !subject) subject = h.value || ""
      if (h.name === "Date") lastDate = h.value || lastDate
      if (["From", "To", "Cc"].includes(h.name || "")) {
        parseAddresses(h.value || "").forEach((p) => {
          if (!participants.has(p.email)) participants.set(p.email, p)
        })
      }
    }
  }

  return {
    threadId,
    subject,
    snippet: thread.data.messages?.[0]?.snippet || "",
    lastMessageDate: lastDate,
    participants: Array.from(participants.values()),
    messageCount: messages.length,
    bodyPreview: messages
      .slice(0, 3)
      .map((m) => m.snippet || "")
      .join("\n---\n"),
  }
}

function parseAddresses(raw: string): { name: string; email: string }[] {
  const results: { name: string; email: string }[] = []
  const parts = raw.split(",")
  for (const part of parts) {
    const trimmed = part.trim()
    const match = trimmed.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+@[^>]+)>?$/)
    if (match) {
      results.push({
        name: (match[1] || "").trim(),
        email: match[2].trim().toLowerCase(),
      })
    }
  }
  return results
}

export interface AttachmentMeta {
  messageId: string
  attachmentId: string
  filename: string
  mimeType: string
  size: number
}

export interface ThreadMessage {
  messageId: string
  fromName: string
  fromEmail: string
  date: string
  subject: string
  bodyText: string
  snippet: string
  attachments: AttachmentMeta[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findPartByMime(part: any, mimeType: string): any | undefined {
  if (part.mimeType === mimeType && !part.parts?.length) return part
  for (const child of part.parts || []) {
    const found = findPartByMime(child, mimeType)
    if (found) return found
  }
  return undefined
}

const INLINE_IMAGE_PATTERN = /^image\d{3}\.(png|jpe?g|gif|bmp)$/i

function isSignatureAttachment(filename: string, mimeType: string, size: number): boolean {
  if (!mimeType.startsWith("image/")) return false
  if (INLINE_IMAGE_PATTERN.test(filename)) return true
  if (size < 100_000 && /^(logo|banner|icon|signature|footer|header)\b/i.test(filename)) return true
  return false
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAttachments(messageId: string, part: any): AttachmentMeta[] {
  const results: AttachmentMeta[] = []
  if (part.filename && part.body?.attachmentId) {
    const filename = part.filename as string
    const mimeType = (part.mimeType || "application/octet-stream") as string
    const size = (part.body.size || 0) as number
    if (!isSignatureAttachment(filename, mimeType, size)) {
      results.push({ messageId, attachmentId: part.body.attachmentId, filename, mimeType, size })
    }
  }
  for (const child of part.parts || []) {
    results.push(...extractAttachments(messageId, child))
  }
  return results
}

export async function fetchThreadMessages(
  gmail: GmailClient,
  threadId: string
): Promise<ThreadMessage[]> {
  const thread = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  })

  const messages: ThreadMessage[] = []
  for (const msg of thread.data.messages || []) {
    const headers = msg.payload?.headers || []
    const getHeader = (name: string) => headers.find((h) => h.name === name)?.value || ""

    const fromRaw = getHeader("From")
    const parsed = parseAddresses(fromRaw)
    const from = parsed[0] || { name: "", email: "" }

    let bodyText = ""
    if (msg.payload) {
      const textPart = findPartByMime(msg.payload, "text/plain")
      if (textPart?.body?.data) {
        bodyText = Buffer.from(textPart.body.data, "base64url").toString("utf-8")
      } else {
        const htmlPart = findPartByMime(msg.payload, "text/html")
        if (htmlPart?.body?.data) {
          bodyText = Buffer.from(htmlPart.body.data, "base64url")
            .toString("utf-8")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        }
      }
    }

    const attachments = msg.payload ? extractAttachments(msg.id || "", msg.payload) : []

    messages.push({
      messageId: msg.id || "",
      fromName: from.name,
      fromEmail: from.email,
      date: getHeader("Date"),
      subject: getHeader("Subject"),
      bodyText,
      snippet: msg.snippet || "",
      attachments,
    })
  }

  return messages
}

export async function fetchAttachmentData(
  gmail: GmailClient,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const res = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  })
  return Buffer.from(res.data.data || "", "base64url")
}

export async function searchThreads(gmail: GmailClient, query: string): Promise<string[]> {
  const threadIds: string[] = []
  let pageToken: string | undefined

  do {
    const res = await gmail.users.threads.list({
      userId: "me",
      q: query,
      maxResults: 500,
      pageToken,
    })
    for (const t of res.data.threads || []) {
      if (t.id) threadIds.push(t.id)
    }
    pageToken = res.data.nextPageToken || undefined
  } while (pageToken)

  return threadIds
}
