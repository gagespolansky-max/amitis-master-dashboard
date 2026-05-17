export const KNOWN_PERSON_NAMES_BY_EMAIL: Record<string, string> = {
  "aabdulali@amitiscapital.com": "Adil Abdulali",
  "afeldheim@amitiscapital.com": "Adam Feldheim",
  "csolarz@amitiscapital.com": "Chris Solarz",
  "gspolansky@amitiscapital.com": "Gage Spolansky",
  "jpgonzalez@amitiscapital.com": "JP Gonzalez",
  "lzou@amitiscapital.com": "Leyu Zou",
  "mmonajem@amitiscapital.com": "MM",
}

export function knownPersonNameForEmail(email: string | null | undefined): string | null {
  if (!email) return null
  return KNOWN_PERSON_NAMES_BY_EMAIL[email.toLowerCase()] ?? null
}
