import { NextRequest, NextResponse } from "next/server"
import { createSSRSupabaseClient } from "@/lib/supabase-ssr"

async function signOutAndRedirect(req: NextRequest) {
  const supabase = await createSSRSupabaseClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(`${req.nextUrl.origin}/login`)
}

export const GET = signOutAndRedirect
export const POST = signOutAndRedirect
