// Known document/file-sharing domains and their display labels
const LINK_PATTERNS: [RegExp, string][] = [
  [/dropbox\.com/i, "Dropbox"],
  [/drive\.google\.com/i, "Google Drive"],
  [/docs\.google\.com/i, "Google Docs"],
  [/sheets\.google\.com/i, "Google Sheets"],
  [/slides\.google\.com/i, "Google Slides"],
  [/docusign\.(com|net)/i, "DocuSign"],
  [/box\.com/i, "Box"],
  [/sharepoint\.com/i, "SharePoint"],
  [/onedrive\.live\.com/i, "OneDrive"],
  [/1drv\.ms/i, "OneDrive"],
  [/intralinks\.com/i, "Intralinks"],
  [/datasite\.com/i, "Datasite"],
  [/ansarada\.com/i, "Ansarada"],
  [/firmex\.com/i, "Firmex"],
  [/wetransfer\.com/i, "WeTransfer"],
  [/notion\.so/i, "Notion"],
  [/airtable\.com/i, "Airtable"],
  [/pitch\.com/i, "Pitch"],
  [/docsend\.com/i, "DocSend"],
  [/carta\.com/i, "Carta"],
  [/dealroom\.co/i, "Dealroom"],
  [/pitchbook\.com/i, "PitchBook"],
  [/zoom\.us\/rec/i, "Zoom Recording"],
  [/loom\.com/i, "Loom"],
]

// Domains to always skip (signatures, tracking, social, unsubscribe)
const SKIP_DOMAINS = [
  "linkedin.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "google.com/maps",
  "mailto:",
  "unsubscribe",
  "manage-preferences",
  "email-tracking",
  "mailchimp.com",
  "sendgrid.net",
  "constantcontact.com",
  "hubspot.com",
  "calendly.com",
  "outlook.live.com",
  "aka.ms",
]

export interface ExtractedLink {
  url: string
  label: string
}

export function extractLinksFromText(text: string): ExtractedLink[] {
  // Match URLs — broad but reasonable
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi
  const matches = text.match(urlRegex) || []

  const seen = new Set<string>()
  const results: ExtractedLink[] = []

  for (const rawUrl of matches) {
    // Clean trailing punctuation
    const url = rawUrl.replace(/[.,;:!?)>\]]+$/, "")

    // Skip if too short or already seen
    if (url.length < 15) continue
    const normalized = url.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)

    // Skip known noise domains
    if (SKIP_DOMAINS.some((d) => normalized.includes(d))) continue

    // Check against known patterns
    const matched = LINK_PATTERNS.find(([re]) => re.test(url))
    if (matched) {
      results.push({ url, label: matched[1] })
      continue
    }

    // Also catch URLs with document-like paths
    if (/\/(shared|file|folder|document|download|view|attachment|dataroom|portal)/i.test(url)) {
      // Try to get a label from the domain
      try {
        const host = new URL(url).hostname.replace("www.", "")
        const parts = host.split(".")
        const label = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
        results.push({ url, label })
      } catch {
        results.push({ url, label: "Link" })
      }
    }
  }

  return results
}
