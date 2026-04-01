import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('priorities')
      .select('board_state, last_refreshed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json({
        this_week: [],
        this_month: [],
        on_deck: [],
        last_refreshed: null,
      })
    }

    return NextResponse.json({
      ...data.board_state,
      last_refreshed: data.last_refreshed,
    })
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
    const supabase = createServerClient()
    const body = await request.json()
    const { last_refreshed, ...board_state } = body

    // Upsert: update the single priorities row
    const { data: existing } = await supabase
      .from('priorities')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      await supabase
        .from('priorities')
        .update({
          board_state,
          last_refreshed: last_refreshed || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('priorities')
        .insert({
          board_state,
          last_refreshed: last_refreshed || new Date().toISOString(),
        })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
