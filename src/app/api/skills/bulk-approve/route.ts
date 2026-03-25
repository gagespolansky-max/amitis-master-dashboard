import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { proposal_ids } = await request.json()

    if (!proposal_ids || !Array.isArray(proposal_ids) || proposal_ids.length === 0) {
      return NextResponse.json(
        { error: 'proposal_ids must be a non-empty array' },
        { status: 400 }
      )
    }

    let approvedCount = 0
    const errors: string[] = []

    for (const proposalId of proposal_ids) {
      try {
        const { data: proposal, error: fetchError } = await supabase
          .from('skill_proposals')
          .select('*')
          .eq('id', proposalId)
          .single()

        if (fetchError || !proposal) {
          errors.push(`Proposal ${proposalId}: not found`)
          continue
        }

        const catalogName = proposal.title.toLowerCase().replace(/\s+/g, '-')

        const { error: insertError } = await supabase
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

        if (insertError) {
          errors.push(`Proposal ${proposalId}: failed to create catalog entry — ${insertError.message}`)
          continue
        }

        const { error: updateError } = await supabase
          .from('skill_proposals')
          .update({
            status: 'approved',
            reviewed_by: 'Gage',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', proposalId)

        if (updateError) {
          errors.push(`Proposal ${proposalId}: catalog entry created but failed to update status — ${updateError.message}`)
          continue
        }

        approvedCount++
      } catch (err) {
        errors.push(`Proposal ${proposalId}: unexpected error — ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({
      success: true,
      approved_count: approvedCount,
      errors,
    })
  } catch (error) {
    console.error('Bulk approve error:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk approval' },
      { status: 500 }
    )
  }
}
