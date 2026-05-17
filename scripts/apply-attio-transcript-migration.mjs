import fs from "node:fs"

const MIGRATION_PATH = "data/migrations/006-attio-transcript-memory.sql"

function loadDotEnv(path) {
  if (!fs.existsSync(path)) return {}

  const env = {}
  for (const rawLine of fs.readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const equalsIndex = line.indexOf("=")
    if (equalsIndex === -1) continue
    const key = line.slice(0, equalsIndex).trim()
    let value = line.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function projectRefFromUrl(supabaseUrl) {
  if (!supabaseUrl) return null
  const host = new URL(supabaseUrl).hostname
  return host.endsWith(".supabase.co") ? host.split(".")[0] : null
}

async function runSql({ projectRef, accessToken, query }) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query }),
  })

  const text = await response.text()
  let body = text
  try {
    body = JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    // Keep non-JSON responses as-is.
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  }
}

async function main() {
  const env = { ...process.env, ...loadDotEnv(".env.local") }
  const apply = process.argv.includes("--apply")
  const projectRef = env.SUPABASE_PROJECT_REF ?? projectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL)
  const accessToken = env.SUPABASE_ACCESS_TOKEN

  if (!fs.existsSync(MIGRATION_PATH)) {
    throw new Error(`${MIGRATION_PATH} does not exist`)
  }
  if (!projectRef) {
    throw new Error("Set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!accessToken) {
    throw new Error("Set SUPABASE_ACCESS_TOKEN with Supabase Management API database:write access")
  }

  const query = fs.readFileSync(MIGRATION_PATH, "utf8")
  console.log(`project_ref=${projectRef}`)
  console.log(`migration=${MIGRATION_PATH}`)
  console.log(`mode=${apply ? "apply" : "dry-run"}`)

  if (!apply) {
    console.log("Dry-run only. Re-run with --apply to execute the migration.")
    return
  }

  const result = await runSql({ projectRef, accessToken, query })
  console.log(`HTTP ${result.status}`)
  if (result.body) console.log(result.body)
  if (!result.ok) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
