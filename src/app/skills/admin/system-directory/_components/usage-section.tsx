"use client"

import { useState, useEffect } from "react"

interface UsageData {
  totalUses: number
  successCount: number
  failureCount: number
  lastUsed: string | null
  recentInvocations: {
    id: string
    timestamp: string
    outcome: string
    notes: string
    project: string
  }[]
}

interface UsageSectionProps {
  entryName: string
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? "s" : ""} ago`
}

function successRateColor(rate: number): string {
  if (rate >= 80) return "text-success"
  if (rate >= 50) return "text-warning"
  return "text-red-400"
}

function outcomeBadge(outcome: string) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    success: { bg: "rgba(34,197,94,0.12)", text: "#22c55e", label: "✓" },
    partial: { bg: "rgba(234,179,8,0.12)", text: "#eab308", label: "⚠" },
    failure: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", label: "✗" },
  }
  const s = styles[outcome] || styles.partial
  return (
    <span
      style={{ background: s.bg, color: s.text }}
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
    >
      {s.label} {outcome}
    </span>
  )
}

export default function UsageSection({ entryName }: UsageSectionProps) {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/skills/admin/system-directory/api/usage?name=${encodeURIComponent(entryName)}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [entryName])

  if (loading) {
    return <div className="text-xs text-muted py-2">Loading usage data...</div>
  }

  if (!data || data.totalUses === 0) {
    return (
      <div className="text-xs text-muted py-2">
        Run <code className="bg-background px-1 py-0.5 rounded border border-card-border">/skill-analytics</code> after using this skill to start tracking
      </div>
    )
  }

  const successRate = data.totalUses > 0
    ? Math.round((data.successCount / data.totalUses) * 100)
    : 0

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">Total</div>
          <div className="text-lg font-semibold">{data.totalUses}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">Success rate</div>
          <div className={`text-lg font-semibold ${successRateColor(successRate)}`}>
            {successRate}%
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">Last used</div>
          <div className="text-sm">{data.lastUsed ? relativeDate(data.lastUsed) : "never"}</div>
        </div>
      </div>

      {data.recentInvocations.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Recent</div>
          <div className="space-y-1.5">
            {data.recentInvocations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-2 text-xs py-1 border-b border-card-border last:border-0"
              >
                <span className="text-muted w-20 shrink-0">
                  {new Date(inv.timestamp).toLocaleDateString()}
                </span>
                {outcomeBadge(inv.outcome)}
                <span className="text-muted truncate">{inv.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
