import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const PRIORITIES_FILE = path.join(process.cwd(), 'data', 'priorities.json')

export async function GET() {
  try {
    const data = fs.readFileSync(PRIORITIES_FILE, 'utf-8')
    return NextResponse.json(JSON.parse(data))
  } catch {
    return NextResponse.json({
      this_week: [],
      this_month: [],
      on_deck: [],
      last_refreshed: null,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    fs.writeFileSync(PRIORITIES_FILE, JSON.stringify(body, null, 2))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
