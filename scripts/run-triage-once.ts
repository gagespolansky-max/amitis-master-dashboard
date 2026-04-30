// scripts/run-triage-once.ts
// Drive the OIG Triage agent directly, bypassing the browser/auth path.
// Useful when the UI is broken or for debugging the agent itself.
//
// Run with:
//   npx tsx scripts/run-triage-once.ts [hours_back]
//
// Defaults to 1 hour back if no arg provided.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Manually load .env.local into process.env (no dotenv dependency).
const envPath = resolve(__dirname, "..", ".env.local")
const envFile = readFileSync(envPath, "utf-8")
for (const line of envFile.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eq = trimmed.indexOf("=")
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  let value = trimmed.slice(eq + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  if (!process.env[key]) process.env[key] = value
}

// Sanity-check critical envs.
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "ANTHROPIC_API_KEY",
]
const missing = required.filter((k) => !process.env[k])
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "))
  process.exit(1)
}

async function main() {
  // Import after env is loaded so the modules see the right values.
  const { runTriage } = await import("../src/app/oig/triage/_lib/run")
  const { createServerClient } = await import("../src/lib/supabase-server")

  // Find Gage's user_id from the seeded admin row.
  const admin = createServerClient()
  const { data, error } = await admin
    .from("agent_permissions")
    .select("user_id")
    .eq("agent_slug", "chief-of-staff")
    .single()
  if (error || !data) {
    console.error("Could not find a chief-of-staff permission row:", error?.message)
    process.exit(1)
  }
  const userId = data.user_id as string
  console.log(`Running triage for user ${userId}`)

  const hoursArg = process.argv[2] ? Number(process.argv[2]) : 1
  if (!Number.isFinite(hoursArg) || hoursArg <= 0) {
    console.error(`Invalid hours_back: ${process.argv[2]}`)
    process.exit(1)
  }
  console.log(`hours_back = ${hoursArg}`)

  const start = Date.now()
  const result = await runTriage(userId, { hours_back: hoursArg })
  console.log("\n=== RESULT ===")
  console.log(JSON.stringify(result, null, 2))
  console.log(`\nTotal wall time: ${((Date.now() - start) / 1000).toFixed(1)}s`)
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
