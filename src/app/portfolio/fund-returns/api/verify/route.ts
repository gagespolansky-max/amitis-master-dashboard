import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const { id, verified } = await request.json()

  if (!id || typeof verified !== 'boolean') {
    return NextResponse.json({ error: 'Missing id or verified' }, { status: 400 })
  }

  const supabase = createServerClient()
  const updateData: Record<string, unknown> = { verified }
  if (verified) {
    updateData.verified_at = new Date().toISOString()
  } else {
    updateData.verified_at = null
  }

  const { error } = await supabase
    .from('fund_returns')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
