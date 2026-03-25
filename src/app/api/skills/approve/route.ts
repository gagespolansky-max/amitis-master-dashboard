import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { proposal_id } = await request.json()

    if (!proposal_id) {
      return NextResponse.json(
        { error: 'proposal_id is required' },
        { status: 400 }
      )
    }

    const { data: proposal, error: fetchError } = await supabase
      .from('skill_proposals')
      .select('*')
      .eq('id', proposal_id)
      .single()

    if (fetchError || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    const catalogName = proposal.title.toLowerCase().replace(/\s+/g, '-')

    const { data: catalogEntry, error: insertError } = await supabase
      .from('skill_catalog')
      .insert({
        name: catalogName,
        description: proposal.description,
        author: proposal.requested_by,
        source: 'custom',
        source_url: '',
        category: proposal.business_segment || 'workflow',
        install_status: 'available',
        skill_md_content: proposal.submitted_skill_md,
        amitis_readiness: null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create catalog entry:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from('skill_proposals')
      .update({
        status: 'approved',
        reviewed_by: 'Gage',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', proposal_id)

    if (updateError) {
      console.error('Failed to update proposal status:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, catalog_entry: catalogEntry })
  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json(
      { error: 'Failed to approve proposal' },
      { status: 500 }
    )
  }
}
