import { NextRequest, NextResponse } from "next/server"
import { fetchAttachmentData } from "@/app/acio/deals/_lib/gmail"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const messageId = searchParams.get("message_id")
  const attachmentId = searchParams.get("attachment_id")
  const filename = searchParams.get("filename") || "download"
  const mimeType = searchParams.get("mime_type") || "application/octet-stream"

  if (!messageId || !attachmentId) {
    return NextResponse.json({ error: "message_id and attachment_id required" }, { status: 400 })
  }

  try {
    const data = await fetchAttachmentData(messageId, attachmentId)

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(data.length),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to download attachment"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
