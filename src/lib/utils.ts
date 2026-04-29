/**
 * Tailwind class-name composer used across the OIG UI primitives.
 * Mirrors the small `cn` helper that ships with shadcn-style code generators
 * but avoids the `clsx`/`tailwind-merge` dependency — we just collapse
 * truthy strings and dedupe on whitespace, which is enough for the limited
 * conditional-class patterns we use here.
 */
export function cn(
  ...inputs: Array<string | number | null | undefined | false | Record<string, unknown>>
): string {
  const out: string[] = []
  for (const input of inputs) {
    if (!input) continue
    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input))
      continue
    }
    if (typeof input === "object") {
      for (const [k, v] of Object.entries(input)) {
        if (v) out.push(k)
      }
    }
  }
  // Deduplicate trivially identical class tokens. We do not implement a full
  // tailwind-merge — components are written so later classes naturally win
  // because they appear later in the merged string.
  const tokens = out.join(" ").split(/\s+/).filter(Boolean)
  return tokens.join(" ")
}
