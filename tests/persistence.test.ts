import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createFakeSupabase } from "./_helpers/fake-supabase"

const fake = createFakeSupabase()

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => fake,
}))

import {
  appendMessages,
  assertConversationOwner,
  createConversation,
  deriveTitle,
  listConversations,
  loadConversation,
  updateConversationTitle,
} from "@/app/oig/_shared/persistence"

beforeEach(() => fake.__reset())
afterEach(() => fake.__reset())

describe("deriveTitle", () => {
  it("returns the first sentence, capped at 80 chars", () => {
    expect(deriveTitle("Hello world. Second sentence.")).toBe("Hello world")
    expect(deriveTitle("A".repeat(120))).toHaveLength(80)
    expect(deriveTitle("   ")).toBe("Untitled conversation")
  })
})

describe("conversation persistence round-trip", () => {
  it("creates, loads, lists, appends, and titles conversations", async () => {
    const convoId = await createConversation("u1", "chief-of-staff", "Daily brief")
    expect(convoId).toMatch(/[0-9a-f-]{36}/i)

    await appendMessages(convoId, [
      { role: "user", content_json: "What's on my plate?" },
      {
        role: "assistant",
        content_json: [{ type: "text", text: "You have 3 open items." }],
      },
    ])

    const full = await loadConversation(convoId, "u1", "chief-of-staff")
    expect(full.id).toBe(convoId)
    expect(full.messages).toHaveLength(2)
    expect(full.messages[0].role).toBe("user")
    expect(full.messages[1].role).toBe("assistant")

    const list = await listConversations("u1", "chief-of-staff", 10)
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(convoId)

    await updateConversationTitle(convoId, "Renamed")
    const reloaded = await loadConversation(convoId, "u1", "chief-of-staff")
    expect(reloaded.title).toBe("Renamed")
  })

  it("rejects loads from a different user or agent", async () => {
    const convoId = await createConversation("owner", "chief-of-staff")
    await expect(
      loadConversation(convoId, "intruder", "chief-of-staff"),
    ).rejects.toThrow(/does not belong/)
    await expect(
      loadConversation(convoId, "owner", "triage"),
    ).rejects.toThrow(/does not belong/)
  })

  it("does not list other users' conversations", async () => {
    await createConversation("u1", "chief-of-staff", "Mine")
    await createConversation("u2", "chief-of-staff", "Theirs")
    const u1List = await listConversations("u1", "chief-of-staff", 10)
    expect(u1List).toHaveLength(1)
    expect(u1List[0].title).toBe("Mine")
  })

  it("assertConversationOwner throws when the conversation is missing", async () => {
    await expect(
      assertConversationOwner("00000000-0000-0000-0000-000000000000", "u1", "chief-of-staff"),
    ).rejects.toThrow(/not found/)
  })
})
