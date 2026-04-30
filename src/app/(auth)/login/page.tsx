"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ")

const ERROR_MESSAGES: Record<string, string> = {
  domain: "Access restricted to @amitiscapital.com accounts.",
  missing_code: "Sign-in was cancelled. Please try again.",
  exchange_failed: "Sign-in failed. Please try again.",
}

function LoginContent() {
  const params = useSearchParams()
  const next = params.get("next") || "/"
  const errorKey = params.get("error")
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] ?? "Sign-in failed." : null
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setLoading(true)
    const supabase = createBrowserSupabaseClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: GOOGLE_SCOPES,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          hd: "amitiscapital.com",
        },
      },
    })
  }

  return (
    <div className="w-full max-w-sm px-8 py-10 rounded-xl border border-white/10 bg-[#1a1d26] shadow-xl">
      <h1 className="text-2xl font-semibold mb-2">Amitis Master Dashboard</h1>
      <p className="text-sm text-white/60 mb-8">Sign in with your Amitis Google account.</p>

      {errorMessage && (
        <div className="mb-5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <button
        onClick={signIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-md bg-[#6366f1] hover:bg-[#7477f0] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-medium transition-colors"
      >
        <GoogleIcon />
        {loading ? "Redirecting…" : "Sign in with Google"}
      </button>

      <p className="mt-6 text-xs text-white/40 leading-relaxed">
        We request Gmail access so the ACIO deal tracker can scan your inbox for new deals.
        Your refresh token is stored server-side and used only when you run a scan.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#fff"
        d="M21.35 11.1h-9.17v2.95h5.27c-.23 1.48-1.68 4.34-5.27 4.34-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.8 0 3.01.77 3.7 1.43l2.52-2.43C16.88 3.96 14.76 3 12.18 3 7.08 3 3 7.08 3 12.18s4.08 9.18 9.18 9.18c5.3 0 8.8-3.72 8.8-8.95 0-.6-.06-1.06-.13-1.31Z"
      />
    </svg>
  )
}
