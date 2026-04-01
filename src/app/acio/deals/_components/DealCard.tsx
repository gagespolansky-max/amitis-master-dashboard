"use client"

import { Deal, STAGE_COLORS, PRIORITY_DOT_COLORS } from "../_lib/types"
import { FileText, Mail, Bell } from "lucide-react"
import StageProgressBar from "./StageProgressBar"

interface DealCardProps {
  deal: Deal
  onClick: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function reminderStatus(date: string | null): "overdue" | "soon" | "normal" | null {
  if (!date) return null
  const diff = new Date(date).getTime() - Date.now()
  const days = diff / 86400000
  if (days < 0) return "overdue"
  if (days <= 7) return "soon"
  return "normal"
}

export default function DealCard({ deal, onClick }: DealCardProps) {
  const primaryContact = deal.key_contacts?.find((c) => c.role === "counterparty") || deal.key_contacts?.[0]
  const dotColor = PRIORITY_DOT_COLORS[deal.priority || "medium"]
  const reminder = reminderStatus(deal.reminder_date)

  return (
    <div
      onClick={onClick}
      className="bg-card-bg border border-card-border rounded-lg p-3 cursor-pointer hover:border-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {dotColor && <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />}
          <h3 className="font-medium text-sm text-foreground leading-tight truncate">{deal.company_name}</h3>
        </div>
        <div className="flex gap-1 shrink-0 items-center">
          {reminder && (
            <Bell
              size={14}
              className={
                reminder === "overdue"
                  ? "text-red-400"
                  : reminder === "soon"
                  ? "text-yellow-400"
                  : "text-muted"
              }
            />
          )}
          {deal.memo_url && <FileText size={14} className="text-accent" />}
          <Mail size={14} className="text-muted" />
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="mb-2">
        <StageProgressBar stage={deal.stage} stageUpdatedAt={deal.stage_updated_at} compact />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {deal.deal_type && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${STAGE_COLORS[deal.stage]}`}>
            {deal.deal_type}
          </span>
        )}
        {deal.industry && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
            {deal.industry}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        {primaryContact && (
          <span className="truncate max-w-[60%]">{primaryContact.name || primaryContact.email}</span>
        )}
        <span className="shrink-0">{timeAgo(deal.updated_at)}</span>
      </div>

      {deal.source === "baseline_scan" && deal.status === "pending_review" && (
        <div className="mt-2 text-xs text-warning">Pending review</div>
      )}
    </div>
  )
}
