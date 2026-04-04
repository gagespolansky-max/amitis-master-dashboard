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
