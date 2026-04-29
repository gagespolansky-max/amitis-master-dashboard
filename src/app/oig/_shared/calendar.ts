import { google, calendar_v3 } from "googleapis"
import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"

export type CalendarClient = calendar_v3.Calendar

/**
 * Build a Google Calendar client for the user using the same OAuth refresh
 * token captured during Supabase Auth login. Requires that the user has
 * granted `calendar.readonly` — if their token predates that scope, the API
 * will 403 and they need to sign out + sign back in.
 */
export async function getCalendarClientForUser(userId: string): Promise<CalendarClient> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("user_gmail_credentials")
    .select("refresh_token")
    .eq("user_id", userId)
    .single()

  if (error || !data?.refresh_token) {
    throw new Error(
      `No Google credentials for user ${userId}. Sign in again to reconnect.`,
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ refresh_token: data.refresh_token })
  return google.calendar({ version: "v3", auth: oauth2Client })
}
