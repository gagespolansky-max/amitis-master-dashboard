import { webcrypto } from "node:crypto"

export type CronAuthorizationResult =
  | { authorized: true }
  | { authorized: false; status: 401; body: { error: string } }

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com"
const GITHUB_OIDC_JWKS_URL = "https://token.actions.githubusercontent.com/.well-known/jwks"
const GITHUB_OIDC_AUDIENCE = "attio-transcript-ingest"
const GITHUB_REPOSITORY = "gagespolansky-max/amitis-master-dashboard"
const GITHUB_WORKFLOW_REF =
  "gagespolansky-max/amitis-master-dashboard/.github/workflows/attio-transcript-ingest.yml@refs/heads/main"

type JwtHeader = {
  alg?: string
  kid?: string
}

type GitHubOidcClaims = {
  iss?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  repository?: string
  workflow_ref?: string
  ref?: string
}

type JwksKey = JsonWebKey & {
  kid?: string
}

export async function authorizeCronRequest(
  headers: Headers,
  cronSecret: string | undefined,
): Promise<CronAuthorizationResult> {
  const authorization = headers.get("authorization")

  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return { authorized: true }
  }

  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : null
  if (token && await verifyGitHubActionsOidcToken(token)) {
    return { authorized: true }
  }

  return { authorized: false, status: 401, body: { error: "Unauthorized" } }
}

async function verifyGitHubActionsOidcToken(token: string): Promise<boolean> {
  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".")
    if (!headerPart || !payloadPart || !signaturePart) return false

    const header = parseJwtPart<JwtHeader>(headerPart)
    const claims = parseJwtPart<GitHubOidcClaims>(payloadPart)
    if (header.alg !== "RS256" || !header.kid) return false
    if (!areTrustedGitHubOidcClaims(claims)) return false

    const response = await fetch(GITHUB_OIDC_JWKS_URL, { cache: "force-cache" })
    if (!response.ok) return false
    const jwks = await response.json() as { keys?: JwksKey[] }
    const jwk = jwks.keys?.find((key) => key.kid === header.kid)
    if (!jwk) return false

    const publicKey = await webcrypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    )
    const signingInput = new TextEncoder().encode(`${headerPart}.${payloadPart}`)
    const signature = base64UrlToBytes(signaturePart)
    return await webcrypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, signingInput)
  } catch {
    return false
  }
}

function areTrustedGitHubOidcClaims(claims: GitHubOidcClaims): boolean {
  const now = Math.floor(Date.now() / 1000)
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  return (
    claims.iss === GITHUB_OIDC_ISSUER &&
    aud.includes(GITHUB_OIDC_AUDIENCE) &&
    claims.repository === GITHUB_REPOSITORY &&
    claims.workflow_ref === GITHUB_WORKFLOW_REF &&
    claims.ref === "refs/heads/main" &&
    typeof claims.exp === "number" &&
    claims.exp > now &&
    (typeof claims.nbf !== "number" || claims.nbf <= now + 60) &&
    (typeof claims.iat !== "number" || claims.iat <= now + 60)
  )
}

function parseJwtPart<T>(part: string): T {
  return JSON.parse(Buffer.from(base64UrlToBytes(part)).toString("utf8")) as T
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  return Uint8Array.from(Buffer.from(base64, "base64"))
}
