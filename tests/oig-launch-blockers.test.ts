import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

describe("OIG launch-blocker contracts", () => {
  it("requests Calendar readonly with Gmail scopes in login and callback", () => {
    const login = read("src/app/(auth)/login/page.tsx")
    const callback = read("src/app/auth/callback/route.ts")

    for (const source of [login, callback]) {
      expect(source).toMatch("https://www.googleapis.com/auth/gmail.readonly")
      expect(source).toMatch("https://www.googleapis.com/auth/gmail.modify")
      expect(source).toMatch("https://www.googleapis.com/auth/calendar.readonly")
    }
  })

  it("exposes OIG to teammates in middleware and sidebar", () => {
    const middleware = read("src/middleware.ts")
    const sidebar = read("src/components/sidebar.tsx")

    expect(middleware).toMatch('TEAMMATE_ALLOWED_PREFIXES = ["/acio", "/oig", "/logout"]')
    expect(sidebar).toMatch("TEAMMATE_VISIBLE_HREFS = new Set(['/acio', '/oig'])")
  })

  it("keeps the Triage prompt aligned to the actual fetch_recent_gmail tool", () => {
    const run = read("src/app/oig/triage/_lib/run.ts")
    const tools = read("src/app/oig/triage/_lib/tools.ts")

    expect(run).toMatch("Begin with fetch_recent_gmail")
    expect(run).not.toMatch("Begin with gmail_search_recent")
    expect(tools).toMatch('name: "fetch_recent_gmail"')
    expect(tools).toMatch('case "fetch_recent_gmail"')
  })
})
