import { NextRequest, NextResponse } from 'next/server'
import { getDropboxHeaders } from '../../_lib/dropbox'

export async function POST(request: NextRequest) {
  const token = process.env.DROPBOX_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Dropbox token not configured' }, { status: 500 })
  }

  const { from_path, to_path } = await request.json()

  if (!from_path || !to_path) {
    return NextResponse.json({ error: 'Missing from_path or to_path' }, { status: 400 })
  }

  try {
    const res = await fetch('https://api.dropboxapi.com/2/files/move_v2', {
      method: 'POST',
      headers: { ...getDropboxHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_path, to_path, autorename: false }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Dropbox rename error:', res.status, text)
      return NextResponse.json({ error: 'Failed to rename file' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data.metadata)
  } catch (err) {
    console.error('Rename error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
