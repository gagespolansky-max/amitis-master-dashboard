import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getUserRole: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
  getUserRole: mocks.getUserRole,
}))

import { requireAgentAccess, userHasAgentAccess } from "@/lib/agent-auth"

afterEach(() => {
  mocks.requireUser.mockReset()
  mocks.getUserRole.mockReset()
})

describe("userHasAgentAccess", () => {
  it("allows admins to use Chief of Staff", async () => {
    mocks.getUserRole.mockResolvedValue("admin")
    await expect(userHasAgentAccess("user-1", "chief-of-staff")).resolves.toBe(true)
  })

  it("allows teammates to use Chief of Staff for launch", async () => {
    mocks.getUserRole.mockResolvedValue("teammate")
    await expect(userHasAgentAccess("user-2", "chief-of-staff")).resolves.toBe(true)
  })

  it("defaults unknown agents to admin-only", async () => {
    mocks.getUserRole.mockResolvedValue("teammate")
    await expect(userHasAgentAccess("user-3", "future-agent")).resolves.toBe(false)
  })
})

describe("requireAgentAccess", () => {
  it("returns the signed-in teammate user when the agent allows teammates", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-4", email: "t@amitiscapital.com" })
    mocks.getUserRole.mockResolvedValue("teammate")

    const user = await requireAgentAccess("chief-of-staff")

    expect(user.id).toBe("user-4")
  })

  it("throws a 403 Response when the signed-in user lacks access", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-5" })
    mocks.getUserRole.mockResolvedValue("teammate")

    await expect(requireAgentAccess("future-agent")).rejects.toMatchObject({ status: 403 })
  })
})
