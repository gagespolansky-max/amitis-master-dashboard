import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BUCKET = 'gage-screenshots'
const TABLE = 'gage_screenshots'

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

// POST — upload image + create entry
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const image = formData.get('image') as File | null
  const extractedText = formData.get('extracted_text') as string

  if (!image) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  // Upload to Supabase Storage
  const fileName = `${Date.now()}-${image.name}`
  const buffer = Buffer.from(await image.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: image.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)

  // Insert entry
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      image_url: urlData.publicUrl,
      extracted_text: extractedText,
      edited_text: extractedText,
      description: '',
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
