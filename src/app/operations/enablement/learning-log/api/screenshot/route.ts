import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import Anthropic from "@anthropic-ai/sdk"
import type { ImageBlockParam } from "@anthropic-ai/sdk/resources/messages"
import { z } from "zod"
import { safeParseAIResponse } from "@/lib/ai-parse"
import { SCREENSHOT_PROMPT } from "../../_lib/learning-log-prompt"

const BUCKET = "learning-log-screenshots"
const anthropic = new Anthropic()

const ScreenshotSchema = z.object({
  concept: z.string(),
  explanation: z.string(),
  content: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
})

// POST — create new entry from one or more screenshots
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const formData = await req.formData()

  // Collect all image files from FormData
  const images: File[] = []
  for (const [key, value] of formData.entries()) {
    if (key === "image" && value instanceof File && value.type.startsWith("image/")) {
      images.push(value)
    }
  }

  if (images.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 })
  }

  // Prepare all images: base64 for Claude, buffers for storage
  const prepared = await Promise.all(
    images.map(async (image) => {
      const arrayBuffer = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString("base64")
      return { image, buffer, base64 }
    })
  )

  // Run Claude vision analysis (all images) and storage uploads in parallel
  const visionContent: ImageBlockParam[] = prepared.map(({ base64, image }) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: image.type as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
      data: base64,
    },
  }))

  const uploadPromises = prepared.map(({ buffer, image }) =>
    supabase.storage
      .from(BUCKET)
      .upload(`${Date.now()}-${Math.random().toString(36).slice(2)}-${image.name}`, buffer, {
        contentType: image.type,
        upsert: false,
      })
  )

  const [analysis, ...uploadResults] = await Promise.all([
    analyzeScreenshots(visionContent, images.length),
    ...uploadPromises,
  ])

  // Collect public URLs for successful uploads
  const imageUrls: string[] = []
  for (const result of uploadResults) {
    if (result.error) {
      console.error("Upload error:", result.error.message)
      continue
    }
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(result.data.path)
    imageUrls.push(urlData.publicUrl)
  }

  const { data, error } = await supabase
    .from("learning_log")
    .insert({
      concept: analysis.concept,
      explanation: analysis.explanation,
      content: analysis.content,
      category: analysis.category,
      tags: analysis.tags,
      source: "screenshot",
      image_urls: imageUrls,
      context: `Extracted from ${images.length} screenshot${images.length > 1 ? "s" : ""}`,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// PATCH — add more screenshots to an existing entry
export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const formData = await req.formData()
  const entryId = formData.get("id") as string | null

  if (!entryId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const images: File[] = []
  for (const [key, value] of formData.entries()) {
    if (key === "image" && value instanceof File && value.type.startsWith("image/")) {
      images.push(value)
    }
  }

  if (images.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 })
  }

  // Get existing entry
  const { data: existing } = await supabase
    .from("learning_log")
    .select("image_urls")
    .eq("id", entryId)
    .single()

  const existingUrls: string[] = existing?.image_urls || []

  // Upload new images
  const newUrls: string[] = []
  for (const image of images) {
    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(`${Date.now()}-${Math.random().toString(36).slice(2)}-${image.name}`, buffer, {
        contentType: image.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Upload error:", uploadError.message)
      continue
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(uploadData.path)
    newUrls.push(urlData.publicUrl)
  }

  const { data, error } = await supabase
    .from("learning_log")
    .update({
      image_urls: [...existingUrls, ...newUrls],
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

async function analyzeScreenshots(
  visionContent: ImageBlockParam[],
  imageCount: number
) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: [
          ...visionContent,
          {
            type: "text" as const,
            text: SCREENSHOT_PROMPT(imageCount),
          },
        ],
      },
    ],
  })

  const text =
    response.content[0].type === "text" ? response.content[0].text : ""
  const result = safeParseAIResponse(text, ScreenshotSchema)

  if (result.success) return result.data

  console.error("Screenshot analysis parse error:", result.error)
  return {
    concept: "Screenshot Entry",
    explanation: text.slice(0, 200),
    content: text,
    category: "general" as const,
    tags: [],
  }
}
