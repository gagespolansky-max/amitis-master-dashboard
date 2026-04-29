import { readFileSync } from "node:fs"
import { test } from "node:test"
import assert from "node:assert/strict"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("OAuth login and callback both request Calendar readonly with Gmail scopes", () => {
  const login = read("src/app/(auth)/login/page.tsx")
  const callback = read("src/app/auth/callback/route.ts")

  for (const source of [login, callback]) {
    assert.match(source, /https:\/\/www\.googleapis\.com\/auth\/gmail\.readonly/)
    assert.match(source, /https:\/\/www\.googleapis\.com\/auth\/gmail\.modify/)
    assert.match(source, /https:\/\/www\.googleapis\.com\/auth\/calendar\.readonly/)
  }
})

test("OIG teammate access is wired through middleware, sidebar, and agent auth", () => {
  const middleware = read("src/middleware.ts")
  const sidebar = read("src/components/sidebar.tsx")
  const agentAuth = read("src/lib/agent-auth.ts")

  assert.match(middleware, /TEAMMATE_ALLOWED_PREFIXES = \["\/acio", "\/oig", "\/logout"\]/)
  assert.match(sidebar, /TEAMMATE_VISIBLE_HREFS = new Set\(\['\/acio', '\/oig'\]\)/)
  assert.match(agentAuth, /\[OIG_AGENT_SLUG\]: \["admin", "teammate"\]/)
})

test("COS conversation and memory tables are covered by the runtime migration", () => {
  const migration = read("src/app/oig/_schema/migrations/002_agent_runtime.sql")
  const persistence = read("src/app/oig/_shared/persistence.ts")
  const cosTools = read("src/app/oig/cos/_lib/cos-tools.ts")

  for (const table of ["agent_conversations", "agent_messages", "agent_memory"]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`))
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`))
  }
  assert.match(migration, /conversation_id\s+uuid not null references public\.agent_conversations\(id\) on delete cascade/)
  assert.match(migration, /unique \(user_id, agent_slug, filename\)/)
  assert.match(persistence, /\.from\("agent_conversations"\)/)
  assert.match(persistence, /\.from\("agent_messages"\)/)
  assert.match(cosTools, /\.from\("agent_memory"\)/)
})

test("Calendar API reports reauth needs without failing the UI request", () => {
  const route = read("src/app/oig/cos/api/calendar/route.ts")
  const calendar = read("src/app/oig/_shared/calendar.ts")

  assert.match(calendar, /granted `calendar\.readonly`/)
  assert.match(route, /needs_reauth: true/)
  assert.match(route, /lower\.includes\("scope"\)/)
  assert.match(route, /status: 200/)
})

test("Triage prompt names the actual tool and persistence remains idempotent", () => {
  const run = read("src/app/oig/triage/_lib/run.ts")
  const tools = read("src/app/oig/triage/_lib/tools.ts")
  const db = read("src/app/oig/_shared/db.ts")

  assert.match(run, /Begin with fetch_recent_gmail/)
  assert.doesNotMatch(run, /gmail_search_recent/)
  assert.match(tools, /name: "fetch_recent_gmail"/)
  assert.match(tools, /case "fetch_recent_gmail"/)
  assert.match(db, /findExistingInteraction/)
  assert.match(db, /upsertInteraction/)
  assert.match(db, /existingByTitle/)
})
