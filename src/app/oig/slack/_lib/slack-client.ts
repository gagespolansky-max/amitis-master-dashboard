interface SlackPostMessageResponse {
  ok: boolean
  ts?: string
  error?: string
}

export async function postSlackThreadReply(args: {
  channel: string
  threadTs: string
  text: string
}): Promise<string> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) throw new Error("SLACK_BOT_TOKEN is not configured")

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: args.channel,
      thread_ts: args.threadTs,
      text: args.text,
      mrkdwn: true,
      unfurl_links: false,
      unfurl_media: false,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as SlackPostMessageResponse
  if (!response.ok || !payload.ok || !payload.ts) {
    throw new Error(`Slack chat.postMessage failed: ${payload.error ?? response.statusText}`)
  }

  return payload.ts
}
