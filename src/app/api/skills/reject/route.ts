import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { proposal_id, reason } = await request.json()

    if (!proposal_id) {
      return NextResponse.json(
        { error: 'proposal_id is required' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      )
    }

    const { data: proposal, error: updateError } = await supabase
      .from('skill_proposals')
      .update({
        status: 'rejected',
        reviewed_by: 'Gage',
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', proposal_id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to reject proposal:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, proposal })
  } catch (error) {
    console.error('Reject error:', error)
    return NextResponse.json(
      { error: 'Failed to reject proposal' },
      { status: 500 }
    )
  }
}
