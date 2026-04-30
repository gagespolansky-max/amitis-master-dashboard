import type Anthropic from "@anthropic-ai/sdk"
import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"

export interface ConversationSummary {
  id: string
  title: string | null
  agent_slug: string
  created_at: string
  updated_at: string
}

export interface ConversationFull extends ConversationSummary {
  messages: Anthropic.MessageParam[]
}

/**
 * Create a new conversation row for the user + agent. Returns the new conversation id.
 */
export async function createConversation(
  userId: string,
  agentSlug: string,
  title?: string,
): Promise<string> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("agent_conversations")
    .insert({ user_id: userId, agent_slug: agentSlug, title: title ?? null })
    .select("id")
    .single()
  if (error || !data) throw new Error(`createConversation: ${error?.message ?? "no row"}`)
  return data.id
}

/**
 * Verify the conversation belongs to the user + agent. Throws if not.
 */
export async function assertConversationOwner(
  conversationId: string,
  userId: string,
  agentSlug: string,
): Promise<void> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("agent_conversations")
    .select("user_id, agent_slug")
    .eq("id", conversationId)
    .maybeSingle()
  if (error) throw new Error(`assertConversationOwner: ${error.message}`)
  if (!data) throw new Error(`Conversation ${conversationId} not found`)
  if (data.user_id !== userId || data.agent_slug !== agentSlug) {
    throw new Error("Conversation does not belong to this user or agent")
  }
}

/**
 * Load all messages on a conversation, ordered oldest first, in Anthropic MessageParam shape.
 */
export async function loadConversation(
  conversationId: string,
  userId: string,
  agentSlug: string,
): Promise<ConversationFull> {
  await assertConversationOwner(conversationId, userId, agentSlug)
  const admin = createServiceRoleClient()
  const [{ data: convo, error: cErr }, { data: rows, error: mErr }] = await Promise.all([
    admin
      .from("agent_conversations")
      .select("id, title, agent_slug, created_at, updated_at")
      .eq("id", conversationId)
      .single(),
    admin
      .from("agent_messages")
      .select("role, content_json, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
  ])
  if (cErr || !convo) throw new Error(`loadConversation: ${cErr?.message ?? "missing convo"}`)
  if (mErr) throw new Error(`loadConversation messages: ${mErr.message}`)

  const messages: Anthropic.MessageParam[] = (rows ?? [])
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content_json as Anthropic.MessageParam["content"],
    }))
  return { ...convo, messages }
}

/**
 * Append messages to a conversation. Updates `updated_at` on the conversation row.
 */
export async function appendMessages(
  conversationId: string,
  messages: Array<{ role: "user" | "assistant" | "tool"; content_json: unknown }>,
): Promise<void> {
  if (messages.length === 0) return
  const admin = createServiceRoleClient()
  const rows = messages.map((m) => ({
    conversation_id: conversationId,
    role: m.role,
    content_json: m.content_json,
  }))
  const { error } = await admin.from("agent_messages").insert(rows)
  if (error) throw new Error(`appendMessages: ${error.message}`)
  await admin
    .from("agent_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
}

/**
 * Update the conversation title (used after first turn to summarize the topic).
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string,
): Promise<void> {
  const admin = createServiceRoleClient()
  await admin.from("agent_conversations").update({ title }).eq("id", conversationId)
}

/**
 * List the user's conversations for an agent, most recently updated first.
 */
export async function listConversations(
  userId: string,
  agentSlug: string,
  limit: number = 20,
): Promise<ConversationSummary[]> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("agent_conversations")
    .select("id, title, agent_slug, created_at, updated_at")
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .order("updated_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listConversations: ${error.message}`)
  return data ?? []
}

/**
 * Generate a short title from the first user message (truncated, first sentence).
 */
export function deriveTitle(firstUserContent: string): string {
  const cleaned = firstUserContent.replace(/\s+/g, " ").trim()
  const firstSentence = cleaned.split(/[.!?]\s/)[0] ?? cleaned
  return firstSentence.slice(0, 80) || "Untitled conversation"
}
