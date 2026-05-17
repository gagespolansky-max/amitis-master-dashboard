export type CronAuthorizationResult =
  | { authorized: true }
  | { authorized: false; status: 401; body: { error: string } }

export function authorizeCronRequest(
  headers: Headers,
  cronSecret: string | undefined,
): CronAuthorizationResult {
  if (!cronSecret) {
    return { authorized: false, status: 401, body: { error: "Unauthorized" } }
  }

  if (headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return { authorized: false, status: 401, body: { error: "Unauthorized" } }
  }

  return { authorized: true }
}
