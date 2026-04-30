import { NextRequest, NextResponse } from "next/server"
import { createSSRSupabaseClient } from "@/lib/supabase-ssr"
import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"

const ALLOWED_DOMAIN = "amitiscapital.com"

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.readonly",
]

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") || "/"

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createSSRSupabaseClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  const session = data.session
  const email = session.user.email || ""

  if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=domain`)
  }

  // provider_refresh_token is only present on the session returned by exchangeCodeForSession.
  // We use prompt=consent in the sign-in flow so Google reissues it every time.
  const providerRefreshToken = session.provider_refresh_token
  if (providerRefreshToken) {
    const admin = createServiceRoleClient()
    const { error: upsertError } = await admin
      .from("user_gmail_credentials")
      .upsert(
        {
          user_id: session.user.id,
          email,
          refresh_token: providerRefreshToken,
          scopes: GOOGLE_SCOPES,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
    if (upsertError) {
      console.error("[auth/callback] failed to persist gmail credentials", upsertError)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
