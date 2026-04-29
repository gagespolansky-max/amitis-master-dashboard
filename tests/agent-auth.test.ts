import { afterEach, describe, expect, it, vi } from "vitest"

// Mock the auth helpers used by agent-auth. Hoisted so importing
// agent-auth picks up the mocks.
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserRole: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  getUser: mocks.getUser,
  getUserRole: mocks.getUserRole,
}))

import { requireAgentAccess, userHasAgentAccess } from "@/lib/agent-auth"

afterEach(() => {
  mocks.getUser.mockReset()
  mocks.getUserRole.mockReset()
})

describe("userHasAgentAccess", () => {
  it("returns true for admin role", async () => {
    mocks.getUserRole.mockResolvedValue("admin")
    expect(await userHasAgentAccess("user-1", "chief-of-staff")).toBe(true)
  })

  it("returns false for teammate role", async () => {
    mocks.getUserRole.mockResolvedValue("teammate")
    expect(await userHasAgentAccess("user-1", "chief-of-staff")).toBe(false)
  })

  it("returns false when userId is missing", async () => {
    expect(await userHasAgentAccess("", "chief-of-staff")).toBe(false)
    // Should not even consult the role lookup.
    expect(mocks.getUserRole).not.toHaveBeenCalled()
  })
})

describe("requireAgentAccess", () => {
  it("throws a 401 Response when not signed in", async () => {
    mocks.getUser.mockResolvedValue(null)
    let caught: unknown
    try {
      await requireAgentAccess("chief-of-staff")
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(Response)
    expect((caught as Response).status).toBe(401)
  })

  it("throws a 403 Response when signed in but not admin", async () => {
    mocks.getUser.mockResolvedValue({ id: "user-2" })
    mocks.getUserRole.mockResolvedValue("teammate")
    let caught: unknown
    try {
      await requireAgentAccess("chief-of-staff")
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(Response)
    expect((caught as Response).status).toBe(403)
  })

  it("returns the user when signed in as admin", async () => {
    mocks.getUser.mockResolvedValue({ id: "user-3", email: "g@amitiscapital.com" })
    mocks.getUserRole.mockResolvedValue("admin")
    const user = await requireAgentAccess("chief-of-staff")
    expect(user.id).toBe("user-3")
  })
})
