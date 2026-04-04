import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken, getDropboxHeaders } from '../../_lib/dropbox'

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path')

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  try {
    const token = await getAccessToken()
    const headers = getDropboxHeaders(token)

    const res = await fetch('https://content.dropboxapi.com/2/files/get_thumbnail_v2', {
      method: 'POST',
      headers: {
        ...headers,
        'Dropbox-API-Arg': JSON.stringify({
          resource: { '.tag': 'path', path },
          size: { '.tag': 'w480h320' },
          format: { '.tag': 'png' },
        }),
      },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Dropbox thumbnail error:', res.status, text)
      return NextResponse.json({ error: 'Failed to fetch thumbnail' }, { status: res.status })
    }

    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('Thumbnail proxy error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
