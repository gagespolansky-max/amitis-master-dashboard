import { NextResponse } from 'next/server'
import { getDropboxHeaders } from '../../_lib/dropbox'

interface DropboxFileMetadata {
  '.tag': 'file'
  name: string
  path_lower: string
  path_display: string
  size: number
  server_modified: string
}

interface FolderResult {
  entries: DropboxFileMetadata[]
  has_more: boolean
  cursor: string
}

export interface CollateralFile {
  name: string
  title: string
  path: string
  size: number
  modified: string
  fileType: string
  dropboxUrl: string | null
}

function formatTitle(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const types: Record<string, string> = {
    pdf: 'PDF',
    pptx: 'PowerPoint',
    ppt: 'PowerPoint',
    xlsx: 'Excel',
    xls: 'Excel',
    docx: 'Word',
    doc: 'Word',
    png: 'Image',
    jpg: 'Image',
    jpeg: 'Image',
  }
  return types[ext] || ext.toUpperCase()
}

async function getSharedLink(token: string, path: string): Promise<string | null> {
  const headers = { ...getDropboxHeaders(token), 'Content-Type': 'application/json' }

  try {
    const res = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers,
      body: JSON.stringify({ path, settings: { requested_visibility: { '.tag': 'public' } } }),
    })

    if (res.ok) {
      const data = await res.json()
      return data.url
    }

    if (res.status === 409) {
      const listRes = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
        method: 'POST',
        headers,
        body: JSON.stringify({ path, direct_only: true }),
      })

      if (listRes.ok) {
        const listData = await listRes.json()
        if (listData.links?.length > 0) {
          return listData.links[0].url
        }
      }
    }

    return null
  } catch {
    return null
  }
}

export async function GET() {
  const token = process.env.DROPBOX_ACCESS_TOKEN
  const folder = process.env.DROPBOX_COLLATERALS_FOLDER

  if (!token || !folder) {
    return NextResponse.json(
      { error: 'Dropbox not configured. Set DROPBOX_ACCESS_TOKEN and DROPBOX_COLLATERALS_FOLDER.' },
      { status: 500 }
    )
  }

  try {
    const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: { ...getDropboxHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: folder, include_non_downloadable_files: false }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Dropbox list_folder error:', res.status, text)
      return NextResponse.json({ error: 'Failed to list folder' }, { status: res.status })
    }

    const data: FolderResult = await res.json()

    const files = data.entries.filter((e) => e['.tag'] === 'file')

    const collaterals: CollateralFile[] = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        title: formatTitle(f.name),
        path: f.path_display,
        size: f.size,
        modified: f.server_modified,
        fileType: getFileType(f.name),
        dropboxUrl: await getSharedLink(token, f.path_display),
      }))
    )

    collaterals.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())

    return NextResponse.json(collaterals, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  } catch (err) {
    console.error('Folder listing error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
