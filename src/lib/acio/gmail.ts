import { google } from "googleapis"

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  )
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  })
  return oauth2Client
}

export function getGmailClient() {
  return google.gmail({ version: "v1", auth: getAuth() })
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

export async function fetchThreadMeta(threadId: string): Promise<ThreadMeta> {
  const gmail = getGmailClient()
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

export interface ThreadMessage {
  messageId: string
  fromName: string
  fromEmail: string
  date: string
  subject: string
  bodyText: string
  snippet: string
}

export async function fetchThreadMessages(threadId: string): Promise<ThreadMessage[]> {
  const gmail = getGmailClient()
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
    if (msg.payload?.parts) {
      const textPart = msg.payload.parts.find((p) => p.mimeType === "text/plain")
      if (textPart?.body?.data) {
        bodyText = Buffer.from(textPart.body.data, "base64url").toString("utf-8")
      } else {
        const htmlPart = msg.payload.parts.find((p) => p.mimeType === "text/html")
        if (htmlPart?.body?.data) {
          bodyText = Buffer.from(htmlPart.body.data, "base64url")
            .toString("utf-8")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        }
      }
    } else if (msg.payload?.body?.data) {
      bodyText = Buffer.from(msg.payload.body.data, "base64url").toString("utf-8")
    }

    messages.push({
      messageId: msg.id || "",
      fromName: from.name,
      fromEmail: from.email,
      date: getHeader("Date"),
      subject: getHeader("Subject"),
      bodyText,
      snippet: msg.snippet || "",
    })
  }

  return messages
}

export async function searchThreads(query: string): Promise<string[]> {
  const gmail = getGmailClient()
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
