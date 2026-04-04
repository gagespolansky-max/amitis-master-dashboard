import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

interface MetaMap {
  [dropboxPath: string]: {
    displayTitle: string
    useCase: string
    illustrates: string
    whyCare: string
  }
}

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('collateral_metadata')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const metaMap: MetaMap = {}
  for (const row of data || []) {
    metaMap[row.dropbox_path] = {
      displayTitle: row.display_title || '',
      useCase: row.use_case || '',
      illustrates: row.illustrates || '',
      whyCare: row.why_care || '',
    }
  }

  return NextResponse.json(metaMap)
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { dropboxPath, displayTitle, useCase, illustrates, whyCare } = await req.json()

  if (!dropboxPath) {
    return NextResponse.json({ error: 'dropboxPath is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('collateral_metadata')
    .upsert(
      {
        dropbox_path: dropboxPath,
        display_title: displayTitle || null,
        use_case: useCase || null,
        illustrates: illustrates || null,
        why_care: whyCare || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'dropbox_path' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
