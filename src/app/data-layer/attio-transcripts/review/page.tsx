import { redirect } from "next/navigation"
import PageHeader from "@/components/page-header"
import { userHasAgentAccess } from "@/lib/agent-auth"
import { getUser } from "@/lib/auth"
import TranscriptReviewQueue from "../_components/transcript-review-queue"
import {
  listTranscriptReviewQueue,
  type TranscriptReviewRow,
} from "@/lib/data-layer/attio-transcripts/memory"

export const dynamic = "force-dynamic"

export default async function AttioTranscriptReviewPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const hasAccess = await userHasAgentAccess(user.id, "chief-of-staff")
  if (!hasAccess) redirect("/")

  let transcripts: TranscriptReviewRow[] = []
  let error: string | null = null

  try {
    transcripts = await listTranscriptReviewQueue()
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load transcript review queue"
  }

  return (
    <div>
      <PageHeader
        title="Transcript Review"
        description="Approve Attio transcript observations before they are available to operational counterparty tools."
        status="in-progress"
      />
      <TranscriptReviewQueue initialTranscripts={transcripts} initialError={error} />
    </div>
  )
}
