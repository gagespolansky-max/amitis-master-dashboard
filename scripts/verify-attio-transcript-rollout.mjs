import fs from "node:fs"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const REQUIRED_LOCAL_ENV = [
  "ANTHROPIC_API_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]

const REQUIRED_TABLES = {
  call_transcripts: "id,status,reviewed_by",
  call_participants: "id",
  counterparty_profiles: "id",
  counterparty_observations: "id",
  llm_call_log: "id",
}

const REQUIRED_VERCEL_PRODUCTION_ENV = [
  "ANTHROPIC_API_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]

const OPTIONAL_SLACK_ENV = [
  "ATTIO_TRANSCRIPT_SLACK_BOT_TOKEN",
  "ATTIO_TRANSCRIPT_SLACK_CHANNEL_ID",
  "ATTIO_TRANSCRIPT_REVIEW_URL",
]

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

function statusLine(label, ok, detail = "") {
  const marker = ok ? "ok" : "missing"
  console.log(`${marker.padEnd(7)} ${label}${detail ? ` - ${detail}` : ""}`)
}

async function checkSupabaseTable(env, table, select) {
  const url = new URL(`/rest/v1/${table}`, env.NEXT_PUBLIC_SUPABASE_URL)
  url.searchParams.set("select", select)
  url.searchParams.set("limit", "1")

  const response = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  if (response.ok) return { ok: true, status: response.status }
  let message = response.statusText
  try {
    const body = await response.json()
    message = body.message ?? body.code ?? message
  } catch {
    message = await response.text()
  }
  return { ok: false, status: response.status, message }
}

async function countSupabaseTable(env, table) {
  const url = new URL(`/rest/v1/${table}`, env.NEXT_PUBLIC_SUPABASE_URL)
  url.searchParams.set("select", "id")

  const response = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  })

  if (!response.ok) return null
  const range = response.headers.get("content-range")
  const count = range?.split("/")[1]
  return count && count !== "*" ? Number(count) : null
}

async function listTranscriptStatusCounts(env) {
  const url = new URL("/rest/v1/call_transcripts", env.NEXT_PUBLIC_SUPABASE_URL)
  url.searchParams.set("select", "status")
  url.searchParams.set("limit", "1000")

  const response = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  if (!response.ok) return null
  const rows = await response.json()
  const counts = new Map()
  for (const row of rows) {
    const status = row.status ?? "unknown"
    counts.set(status, (counts.get(status) ?? 0) + 1)
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
}

async function checkAttioToken(env) {
  const token = env.ATTIO_API_KEY || env.ATTIO_ACCESS_TOKEN
  if (!token) return { ok: false, message: "ATTIO_API_KEY or ATTIO_ACCESS_TOKEN is not set" }

  const response = await fetch("https://api.attio.com/v2/meetings?limit=1", {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  })
  if (response.ok) return { ok: true, status: response.status }

  let message = response.statusText
  try {
    const body = await response.json()
    message = body.message ?? body.error ?? message
  } catch {
    message = await response.text()
  }
  return { ok: false, status: response.status, message }
}

async function checkVercelProductionEnv() {
  const { stdout } = await execFileAsync("npx", ["vercel", "env", "ls", "production"], {
    maxBuffer: 1024 * 1024,
  })
  const found = new Set()
  for (const line of stdout.split("\n")) {
    const name = line.trim().split(/\s+/)[0]
    if (name) found.add(name)
  }
  return found
}

async function main() {
  const checkVercel = process.argv.includes("--vercel")
  const env = { ...process.env, ...loadDotEnv(".env.local") }
  let failed = false

  console.log("Local env")
  for (const key of REQUIRED_LOCAL_ENV) {
    const ok = Boolean(env[key])
    statusLine(key, ok)
    failed = failed || !ok
  }

  const hasAttio = Boolean(env.ATTIO_API_KEY || env.ATTIO_ACCESS_TOKEN)
  statusLine("ATTIO_API_KEY or ATTIO_ACCESS_TOKEN", hasAttio)
  failed = failed || !hasAttio

  console.log("\nOptional Slack notification env")
  for (const key of OPTIONAL_SLACK_ENV) {
    statusLine(key, Boolean(env[key]))
  }

  if (checkVercel) {
    console.log("\nVercel production env")
    try {
      const vercelEnv = await checkVercelProductionEnv()
      for (const key of REQUIRED_VERCEL_PRODUCTION_ENV) {
        const ok = vercelEnv.has(key)
        statusLine(key, ok)
        failed = failed || !ok
      }
      const hasVercelAttio = vercelEnv.has("ATTIO_API_KEY") || vercelEnv.has("ATTIO_ACCESS_TOKEN")
      statusLine("ATTIO_API_KEY or ATTIO_ACCESS_TOKEN", hasVercelAttio)
      failed = failed || !hasVercelAttio
      console.log("\nVercel optional Slack notification env")
      for (const key of OPTIONAL_SLACK_ENV) {
        statusLine(key, vercelEnv.has(key))
      }
    } catch (err) {
      statusLine("vercel env ls production", false, err instanceof Error ? err.message : String(err))
      failed = true
    }
  }

  console.log("\nAttio API")
  const attio = await checkAttioToken(env)
  statusLine("meetings endpoint", attio.ok, attio.ok ? `HTTP ${attio.status}` : attio.message)
  failed = failed || !attio.ok

  console.log("\nSupabase tables")
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("missing Supabase URL or service role key; table checks skipped")
    process.exit(1)
  }

  for (const [table, select] of Object.entries(REQUIRED_TABLES)) {
    const result = await checkSupabaseTable(env, table, select)
    statusLine(table, result.ok, result.ok ? `HTTP ${result.status}` : `HTTP ${result.status}: ${result.message}`)
    failed = failed || !result.ok
  }

  if (!failed) {
    console.log("\nSupabase table counts")
    for (const table of Object.keys(REQUIRED_TABLES)) {
      const count = await countSupabaseTable(env, table)
      statusLine(table, count !== null, count !== null ? String(count) : "count unavailable")
      failed = failed || count === null
    }

    console.log("\nTranscript status counts")
    const statusCounts = await listTranscriptStatusCounts(env)
    if (statusCounts) {
      if (statusCounts.length === 0) {
        console.log("ok      no transcripts found")
      } else {
        for (const [status, count] of statusCounts) {
          console.log(`ok      ${status} - ${count}`)
        }
      }
    } else {
      statusLine("call_transcripts.status", false, "status counts unavailable")
      failed = true
    }
  }

  if (failed) {
    console.log("\nRollout verification failed.")
    process.exit(1)
  }

  console.log("\nRollout prerequisites verified.")
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
