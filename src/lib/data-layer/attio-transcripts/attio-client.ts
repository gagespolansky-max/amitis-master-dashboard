import type {
  AttioCallRecording,
  AttioMeeting,
  AttioTranscriptSegment,
} from "./types"

const ATTIO_BASE_URL = "https://api.attio.com/v2"

export class AttioClient {
  private readonly token: string

  constructor(token = process.env.ATTIO_API_KEY ?? process.env.ATTIO_ACCESS_TOKEN ?? "") {
    if (!token) throw new Error("ATTIO_API_KEY or ATTIO_ACCESS_TOKEN is required")
    this.token = token
  }

  async listMeetings(args: {
    endsFrom: string
    startsBefore: string
    limit?: number
    cursor?: string
  }): Promise<{ data: AttioMeeting[]; nextCursor: string | null }> {
    const params = new URLSearchParams({
      ends_from: args.endsFrom,
      starts_before: args.startsBefore,
      sort: "start_desc",
      limit: String(Math.min(200, Math.max(1, args.limit ?? 100))),
    })
    if (args.cursor) params.set("cursor", args.cursor)
    return this.getList<AttioMeeting>(`/meetings?${params}`)
  }

  async listCallRecordings(meetingId: string): Promise<AttioCallRecording[]> {
    const out: AttioCallRecording[] = []
    let cursor: string | null = null
    do {
      const params = new URLSearchParams({ limit: "200" })
      if (cursor) params.set("cursor", cursor)
      const page = await this.getList<AttioCallRecording>(
        `/meetings/${encodeURIComponent(meetingId)}/call_recordings?${params}`,
      )
      out.push(...page.data)
      cursor = page.nextCursor
    } while (cursor)
    return out
  }

  async getCallTranscript(
    meetingId: string,
    callRecordingId: string,
  ): Promise<AttioTranscriptSegment[]> {
    const body = await this.get<{ data?: { transcript?: AttioTranscriptSegment[] } }>(
      `/meetings/${encodeURIComponent(meetingId)}/call_recordings/${encodeURIComponent(callRecordingId)}/transcript`,
    )
    return body.data?.transcript ?? []
  }

  private async getList<T>(path: string): Promise<{ data: T[]; nextCursor: string | null }> {
    const body = await this.get<{ data?: T[]; pagination?: { next_cursor?: string | null } }>(path)
    return {
      data: body.data ?? [],
      nextCursor: body.pagination?.next_cursor ?? null,
    }
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${ATTIO_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`Attio ${response.status} ${response.statusText}: ${text.slice(0, 500)}`)
    }
    return await response.json() as T
  }
}
