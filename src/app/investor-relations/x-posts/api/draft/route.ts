import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { generateDrafts } from '../../_lib/agent'
import { fetchSourceIfUrl } from '../../_lib/fetch-source'

export const runtime = 'nodejs'
export const maxDuration = 60

const client = new Anthropic()

export async function POST(req: NextRequest) {
  let body: { source?: string; angle?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawSource = (body.source ?? '').trim()
  const angle = (body.angle ?? '').trim()

  if (!rawSource) {
    return NextResponse.json({ error: 'source is required' }, { status: 400 })
  }
  if (!angle) {
    return NextResponse.json({ error: 'angle is required' }, { status: 400 })
  }

  let resolvedSource: string
  let fetched = false
  let fetchedUrl: string | undefined
  try {
    const r = await fetchSourceIfUrl(rawSource)
    resolvedSource = r.text
    fetched = r.fetched
    fetchedUrl = r.url
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed'
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  try {
    const result = await generateDrafts({ source: resolvedSource, angle }, client)
    return NextResponse.json({ ...result, fetched, fetched_url: fetchedUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    console.error('[x-posts/draft]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
