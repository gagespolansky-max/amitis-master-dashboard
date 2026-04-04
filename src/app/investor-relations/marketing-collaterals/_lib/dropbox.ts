let cachedToken: { accessToken: string; expiresAt: number } | null = null

/**
 * Gets a valid Dropbox access token, refreshing automatically if expired.
 * Uses DROPBOX_REFRESH_TOKEN + DROPBOX_APP_KEY + DROPBOX_APP_SECRET.
 * Falls back to DROPBOX_ACCESS_TOKEN if refresh credentials aren't set.
 */
export async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN
  const appKey = process.env.DROPBOX_APP_KEY
  const appSecret = process.env.DROPBOX_APP_SECRET

  // Fallback to static token if refresh flow isn't configured
  if (!refreshToken || !appKey || !appSecret) {
    const staticToken = process.env.DROPBOX_ACCESS_TOKEN
    if (!staticToken) throw new Error('No Dropbox credentials configured')
    return staticToken
  }

  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
    return cachedToken.accessToken
  }

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Dropbox token refresh failed:', res.status, text)
    throw new Error('Failed to refresh Dropbox access token')
  }

  const data = await res.json()
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return cachedToken.accessToken
}

export function getDropboxHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }

  const rootNamespaceId = process.env.DROPBOX_ROOT_NAMESPACE_ID
  if (rootNamespaceId) {
    headers['Dropbox-API-Path-Root'] = JSON.stringify({
      '.tag': 'root',
      root: rootNamespaceId,
    })
  }

  return headers
}
