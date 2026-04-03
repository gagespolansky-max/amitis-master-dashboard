import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  try {
    const supabase = createServerClient()

    const { data: skillRow } = await supabase
      .from("skills")
      .select("id")
      .eq("name", name)
      .maybeSingle()

    if (!skillRow) {
      return NextResponse.json({
        totalUses: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: null,
        recentInvocations: [],
      })
    }

    const { data: usageRows } = await supabase
      .from("skill_usage")
      .select("id, triggered_at, outcome, duration_ms, context")
      .eq("skill_id", skillRow.id)
      .order("triggered_at", { ascending: false })
      .limit(10)

    const invocations = usageRows || []

    const { count: totalUses } = await supabase
      .from("skill_usage")
      .select("*", { count: "exact", head: true })
      .eq("skill_id", skillRow.id)

    const { count: successCount } = await supabase
      .from("skill_usage")
      .select("*", { count: "exact", head: true })
      .eq("skill_id", skillRow.id)
      .eq("outcome", "success")

    const { count: failureCount } = await supabase
      .from("skill_usage")
      .select("*", { count: "exact", head: true })
      .eq("skill_id", skillRow.id)
      .eq("outcome", "failure")

    return NextResponse.json({
      totalUses: totalUses || 0,
      successCount: successCount || 0,
      failureCount: failureCount || 0,
      lastUsed: invocations.length > 0 ? invocations[0].triggered_at : null,
      recentInvocations: invocations.map((row) => ({
        id: row.id,
        timestamp: row.triggered_at,
        outcome: row.outcome,
        notes: row.context || "",
        project: "",
      })),
    })
  } catch {
    return NextResponse.json({
      totalUses: 0,
      successCount: 0,
      failureCount: 0,
      lastUsed: null,
      recentInvocations: [],
    })
  }
}
