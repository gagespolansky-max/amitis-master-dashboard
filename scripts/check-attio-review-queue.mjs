const DEFAULT_URL = "http://localhost:3000/data-layer/attio-transcripts/api/review"

function getArg(name) {
  const prefix = `${name}=`
  const value = process.argv.find((arg) => arg.startsWith(prefix))
  return value ? value.slice(prefix.length) : null
}

function authHeaders() {
  const cookie = process.env.ATTIO_REVIEW_COOKIE
  const authorization = process.env.ATTIO_REVIEW_AUTHORIZATION

  if (!cookie && !authorization) {
    throw new Error(
      "Set ATTIO_REVIEW_COOKIE or ATTIO_REVIEW_AUTHORIZATION for an authenticated chief-of-staff user before checking the review queue.",
    )
  }

  const headers = {}
  if (cookie) headers.cookie = cookie
  if (authorization) headers.authorization = authorization
  return headers
}

async function readResponse(response) {
  const text = await response.text()
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

async function main() {
  const baseUrl = getArg("--url") ?? process.env.ATTIO_REVIEW_URL ?? DEFAULT_URL
  const transcriptId = getArg("--transcript-id")
  const action = getArg("--action")
  const headers = authHeaders()

  if (transcriptId || action) {
    if (!transcriptId || !["approve", "ignore"].includes(action ?? "")) {
      throw new Error("Use --transcript-id=<uuid> with --action=approve or --action=ignore for review mutations.")
    }

    const response = await fetch(baseUrl, {
      method: "PATCH",
      headers: {
        ...headers,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        transcript_id: transcriptId,
        action,
      }),
    })
    console.log(`PATCH HTTP ${response.status}`)
    console.log(await readResponse(response))
    if (!response.ok) process.exit(1)
    return
  }

  const url = new URL(baseUrl)
  url.searchParams.set("limit", getArg("--limit") ?? "25")
  const status = getArg("--status")
  if (status) url.searchParams.set("status", status)

  const response = await fetch(url, {
    headers,
  })
  console.log(`GET HTTP ${response.status}`)
  console.log(await readResponse(response))
  if (!response.ok) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
