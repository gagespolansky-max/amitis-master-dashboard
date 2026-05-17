const DEFAULT_URL = "http://localhost:3000/data-layer/attio-transcripts/api/ingest"
const DEFAULT_BODY = {
  hours_back: 72,
  max_meetings: 5,
  max_recordings: 2,
}

function getArg(name) {
  const prefix = `${name}=`
  const value = process.argv.find((arg) => arg.startsWith(prefix))
  return value ? value.slice(prefix.length) : null
}

function getBody() {
  const bodyArg = getArg("--body")
  if (!bodyArg) return DEFAULT_BODY
  try {
    return JSON.parse(bodyArg)
  } catch (err) {
    throw new Error(`Invalid --body JSON: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function main() {
  const url = getArg("--url") ?? process.env.ATTIO_INGEST_URL ?? DEFAULT_URL
  const cookie = process.env.ATTIO_INGEST_COOKIE
  const authorization = process.env.ATTIO_INGEST_AUTHORIZATION

  if (!cookie && !authorization) {
    throw new Error(
      "Set ATTIO_INGEST_COOKIE or ATTIO_INGEST_AUTHORIZATION for an authenticated chief-of-staff user before running this smoke test.",
    )
  }

  const headers = {
    "content-type": "application/json",
  }
  if (cookie) headers.cookie = cookie
  if (authorization) headers.authorization = authorization

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(getBody()),
  })

  const text = await response.text()
  let body = text
  try {
    body = JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    // Keep non-JSON responses as-is.
  }

  console.log(`HTTP ${response.status}`)
  console.log(body)

  if (!response.ok) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
