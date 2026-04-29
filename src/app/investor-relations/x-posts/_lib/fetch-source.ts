/**
 * Best-effort fetch of a URL's article body for the X-posts agent.
 *
 * Strategy:
 *   1. Detect a URL-like source (whole input is a single http/https link).
 *   2. Fetch with a browser-style User-Agent — many sites (BlackRock, Reuters,
 *      etc.) 403 the default Node UA but accept a Chrome UA.
 *   3. Strip <script>/<style>/HTML to plain text and cap length.
 *
 * If the source isn't a URL, return it unchanged. If the fetch fails, throw a
 * clear error — the API route will surface it so the user can paste the text.
 */

const URL_ONLY_RE = /^\s*(https?:\/\/\S+)\s*$/i

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

const FETCH_TIMEOUT_MS = 12_000
const MAX_TEXT_CHARS = 12_000 // plenty of context, keeps prompt size sane

function htmlToText(html: string): string {
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  const noTags = noScripts.replace(/<[^>]+>/g, ' ')
  const decoded = noTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  return decoded.replace(/\s+/g, ' ').trim()
}

export interface FetchedSource {
  /** The text to feed the agent. May be the original URL+title hint + body. */
  text: string
  /** True if the input was a URL we successfully fetched. */
  fetched: boolean
  /** The original URL, if any. */
  url?: string
}

export async function fetchSourceIfUrl(rawSource: string): Promise<FetchedSource> {
  const m = rawSource.match(URL_ONLY_RE)
  if (!m) {
    return { text: rawSource, fetched: false }
  }
  const url = m[1].trim()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : 'unknown error'
    throw new Error(
      `Could not fetch ${url}: ${msg}. Paste the article text directly into the source field instead.`
    )
  }
  clearTimeout(timer)

  if (!response.ok) {
    throw new Error(
      `Could not fetch ${url}: HTTP ${response.status}. Many sites (X.com, Bloomberg, FT) block server fetches — paste the article text directly into the source field instead.`
    )
  }

  const html = await response.text()
  const text = htmlToText(html)
  if (!text || text.length < 200) {
    throw new Error(
      `Fetched ${url} but the page returned little readable text (${text.length} chars). Likely a paywall or JS-rendered page. Paste the article text directly instead.`
    )
  }

  // Cap and prepend the URL so the agent knows where it came from.
  const capped = text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) + '… [truncated]' : text
  return {
    text: `URL: ${url}\n\nArticle text:\n${capped}`,
    fetched: true,
    url,
  }
}
