import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { safeParseAIResponse } from '@/lib/ai-parse'

const BUCKET = 'gage-screenshots'
const TABLE = 'gage_screenshots'
const anthropic = new Anthropic()

const ScreenshotAnalysisSchema = z.object({
  summary: z.string(),
  sender: z.string().default(''),
  action_items: z.array(z.string()).default([]),
  details: z.array(z.string()).default([]),
  source_app: z.string().default('Unknown'),
})

const ManualAddSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  sender: z.string().optional(),
  source_app: z.string().optional(),
  action_items: z.array(z.string()).optional(),
})

// GET — fetch all entries
export async function GET() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ entries: data })
}

async function analyzeScreenshot(base64: string, mediaType: string): Promise<{
  summary: string
  sender: string
  action_items: string[]
  details: string[]
  source_app: string
}> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif', data: base64 },
          },
          {
            type: 'text',
            text: `Analyze this screenshot. Return a JSON object with these fields:
- "summary": A clean 1-2 sentence summary of what this screenshot shows / what's being asked or communicated.
- "sender": Who sent this message (name), or "" if not a message.
- "action_items": Array of specific action items or requests for Gage. Empty array if none.
- "details": Array of only the most important actionable details — specific file names, specific deadlines/dates, specific dollar amounts, or specific fund/company names that Gage needs to act on. MAX 4 items. Do NOT include generic category words, asset class names, or information already covered in the summary. Empty array if none.
- "source_app": The app this screenshot is from (e.g. "Slack", "Teams", "Email", "iMessage", "WhatsApp", "Excel", "Web") or "Unknown".

Return ONLY valid JSON, no markdown fences.`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const result = safeParseAIResponse(text, ScreenshotAnalysisSchema)
  if (result.success) return result.data
  console.error('Screenshot analysis parse error:', result.error)
  return {
    summary: text,
    sender: '',
    action_items: [],
    details: [],
    source_app: 'Unknown',
  }
}

// POST — upload image + analyze with Claude vision, OR manual entry (JSON body)
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  // Manual entry — JSON body, no image
  if (contentType.includes('application/json')) {
    const raw = await request.json()
    const parsed = ManualAddSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
    }
    const { summary, sender, source_app, action_items } = parsed.data

    const structuredText = JSON.stringify({
      summary: summary.trim(),
      sender: sender?.trim() || '',
      action_items: action_items || [],
      details: [],
      source_app: source_app || 'Manual',
    })

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        image_url: '',
        extracted_text: structuredText,
        edited_text: '',
        description: summary.trim(),
        date_label: '',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ entry: data })
  }

  // Screenshot entry — FormData with image
  const formData = await request.formData()
  const image = formData.get('image') as File | null

  if (!image) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  // Convert to base64 for Claude + buffer for storage
  const arrayBuffer = await image.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64 = buffer.toString('base64')

  // Run Claude vision analysis and storage upload in parallel
  const [analysis, uploadResult] = await Promise.all([
    analyzeScreenshot(base64, image.type),
    supabase.storage.from(BUCKET).upload(
      `${Date.now()}-${image.name}`,
      buffer,
      { contentType: image.type, upsert: false }
    ),
  ])

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const fileName = uploadResult.data.path
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)

  // Store the structured analysis as JSON in extracted_text
  const structuredText = JSON.stringify(analysis)

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      image_url: urlData.publicUrl,
      extracted_text: structuredText,
      edited_text: '',
      description: analysis.summary,
      date_label: '',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ entry: data })
}

// PATCH — update entry fields
export async function PATCH(request: NextRequest) {
  const { id, ...updates } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ entry: data })
}

// DELETE — remove entry + image
export async function DELETE(request: NextRequest) {
  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // Get image URL to delete from storage
  const { data: entry } = await supabase
    .from(TABLE)
    .select('image_url')
    .eq('id', id)
    .single()

  if (entry?.image_url) {
    const fileName = entry.image_url.split('/').pop()
    if (fileName) {
      await supabase.storage.from(BUCKET).remove([fileName])
    }
  }

  const { error } = await supabase.from(TABLE).delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
