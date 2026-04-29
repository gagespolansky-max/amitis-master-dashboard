import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireAgentAccess: vi.fn(),
  toolListCalendarEvents: vi.fn(),
}))

vi.mock("@/lib/agent-auth", () => ({
  requireAgentAccess: mocks.requireAgentAccess,
  userHasAgentAccess: vi.fn(),
}))

vi.mock("@/app/oig/cos/_lib/cos-tools", () => ({
  toolListCalendarEvents: mocks.toolListCalendarEvents,
}))

import { GET as calendarGET } from "@/app/oig/cos/api/calendar/route"

afterEach(() => {
  mocks.requireAgentAccess.mockReset()
  mocks.toolListCalendarEvents.mockReset()
})

function makeReq(qs = "") {
  return new Request(`http://localhost/oig/cos/api/calendar${qs ? `?${qs}` : ""}`)
}

describe("calendar GET — reauth handling", () => {
  it("returns 401 Response when access check throws Unauthorized", async () => {
    mocks.requireAgentAccess.mockRejectedValue(new Response("Unauthorized", { status: 401 }))
    const res = await calendarGET(makeReq())
    expect(res.status).toBe(401)
  })

  it("returns needs_reauth=true when the calendar tool errors with insufficient scope", async () => {
    mocks.requireAgentAccess.mockResolvedValue({ id: "user-1" })
    mocks.toolListCalendarEvents.mockRejectedValue(
      new Error("Insufficient permissions: calendar.readonly scope required"),
    )
    const res = await calendarGET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.needs_reauth).toBe(true)
    expect(body.events).toEqual([])
  })

  it("returns needs_reauth=true when no Google credentials are stored", async () => {
    mocks.requireAgentAccess.mockResolvedValue({ id: "user-1" })
    mocks.toolListCalendarEvents.mockRejectedValue(
      new Error("No Google credentials for user user-1. Sign in again to reconnect."),
    )
    const res = await calendarGET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.needs_reauth).toBe(true)
  })

  it("passes through events on success", async () => {
    mocks.requireAgentAccess.mockResolvedValue({ id: "user-1" })
    mocks.toolListCalendarEvents.mockResolvedValue({
      count: 1,
      time_min: "2026-04-29T00:00:00.000Z",
      time_max: "2026-05-02T00:00:00.000Z",
      events: [
        {
          id: "e1",
          summary: "1:1 with Sarah",
          start: "2026-04-29T16:00:00.000Z",
          end: "2026-04-29T16:30:00.000Z",
          attendees: [],
          all_day: false,
          description: null,
          location: null,
          organizer_email: null,
          hangout_link: null,
          html_link: null,
          status: "confirmed",
        },
      ],
    })
    const res = await calendarGET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.needs_reauth).toBeUndefined()
    expect(body.count).toBe(1)
    expect(body.events[0].summary).toBe("1:1 with Sarah")
  })

  it("returns 500 on an unexpected (non-scope) error", async () => {
    mocks.requireAgentAccess.mockResolvedValue({ id: "user-1" })
    mocks.toolListCalendarEvents.mockRejectedValue(new Error("network down"))
    const res = await calendarGET(makeReq())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("network down")
    expect(body.needs_reauth).toBeUndefined()
  })
})
