import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createFakeSupabase } from "./_helpers/fake-supabase"

const fake = createFakeSupabase()

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => fake,
}))

import { processThread } from "@/app/oig/_shared/db"

beforeEach(() => fake.__reset())
afterEach(() => fake.__reset())

const BASE_INPUT = {
  source_type: "gmail" as const,
  source_id: "msg-1",
  thread_id: "thread-1",
  occurred_at: "2026-04-29T12:00:00.000Z",
  relevant: true,
  title: "Q4 fee accrual",
  clean_summary: "Sarah asked for Q4 fee accrual breakdown.",
  interaction_type: "email" as const,
  organization: { name: "Acme LP", domain: "acme.com", org_type: "investor" as const },
  primary_person: { full_name: "Sarah Lin", email: "sarah@acme.com" },
  action_items: [
    {
      title: "Reply to Sarah re Q4 fee accrual",
      priority: "high" as const,
      category: "reply_needed",
      confidence: 0.9,
      owner_email: "gspolansky@amitiscapital.com",
      requested_by_email: "sarah@acme.com",
    },
  ],
}

describe("processThread idempotency", () => {
  it("skips when relevant=false and records the reason", async () => {
    const r = await processThread({
      source_type: "gmail",
      source_id: "msg-skip",
      thread_id: "t-skip",
      occurred_at: "2026-04-29T00:00:00.000Z",
      relevant: false,
      reason: "internal-only",
    })
    expect(r.relevant).toBe(false)
    expect(r.skipped_reason).toBe("internal-only")
    expect(r.action_items_created).toBe(0)
    // No interactions or org rows should be written.
    expect(fake.__store.get("interactions") ?? []).toHaveLength(0)
    expect(fake.__store.get("organizations") ?? []).toHaveLength(0)
  })

  it("creates an interaction + org + person + action item on first run", async () => {
    const r = await processThread(BASE_INPUT)
    expect(r.relevant).toBe(true)
    expect(r.interaction_created).toBe(true)
    expect(r.action_items_created).toBe(1)
    expect(r.action_items_updated).toBe(0)

    expect(fake.__store.get("interactions")).toHaveLength(1)
    expect(fake.__store.get("organizations")).toHaveLength(1)
    // Owner + requester + primary person => 3 people rows.
    expect((fake.__store.get("people") ?? []).length).toBeGreaterThanOrEqual(2)
    expect(fake.__store.get("action_items")).toHaveLength(1)
  })

  it("re-running with the same source_id does not duplicate the interaction or action item", async () => {
    await processThread(BASE_INPUT)
    const r2 = await processThread(BASE_INPUT)

    expect(r2.relevant).toBe(true)
    expect(r2.interaction_created).toBe(false)
    expect(r2.action_items_created).toBe(0)
    expect(r2.action_items_updated).toBe(1)

    expect(fake.__store.get("interactions")).toHaveLength(1)
    expect(fake.__store.get("action_items")).toHaveLength(1)
  })

  it("re-running with a new source_id but same thread_id continues the existing action item rather than duplicating", async () => {
    await processThread(BASE_INPUT)
    const r2 = await processThread({
      ...BASE_INPUT,
      source_id: "msg-2", // newer message in same thread
      occurred_at: "2026-04-30T09:00:00.000Z",
    })

    // A new interaction is written (different source_id) but the action item
    // dedup uses thread_id + lowercased title — so still 1 action item total.
    expect(fake.__store.get("interactions")).toHaveLength(2)
    expect(r2.action_items_created).toBe(0)
    expect(r2.action_items_updated).toBe(1)
    expect(fake.__store.get("action_items")).toHaveLength(1)
  })

  it("low-confidence action items get the low_confidence tag", async () => {
    await processThread({
      ...BASE_INPUT,
      action_items: [
        {
          title: "Maybe schedule follow-up",
          confidence: 0.4,
          category: "follow_up",
        },
      ],
    })
    const tagRows = (fake.__store.get("action_item_tags") ?? []) as Array<{ tag: string }>
    const tags = tagRows.map((t) => t.tag)
    expect(tags).toContain("low_confidence")
  })

  it("matches existing organizations by domain (case-insensitive) on re-run", async () => {
    await processThread(BASE_INPUT)
    await processThread({
      ...BASE_INPUT,
      source_id: "msg-3",
      organization: { name: "ACME LP (renamed)", domain: "ACME.com" },
    })
    expect(fake.__store.get("organizations")).toHaveLength(1)
  })

  it("throws if relevant=true but clean_summary is missing", async () => {
    await expect(
      processThread({
        ...BASE_INPUT,
        clean_summary: undefined,
      }),
    ).rejects.toThrow(/clean_summary is required/)
  })
})
