"use client"

import { Deal, STAGE_COLORS } from "@/lib/acio/types"
import { FileText, Mail } from "lucide-react"

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

export default function DealCard({ deal, onClick }: DealCardProps) {
  const primaryContact = deal.key_contacts?.find((c) => c.role === "counterparty") || deal.key_contacts?.[0]

  return (
    <div
      onClick={onClick}
      className="bg-card-bg border border-card-border rounded-lg p-3 cursor-pointer hover:border-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-sm text-foreground leading-tight">{deal.company_name}</h3>
        <div className="flex gap-1 shrink-0">
          {deal.memo_url && <FileText size={14} className="text-accent" />}
          <Mail size={14} className="text-muted" />
        </div>
      </div>

      {deal.deal_type && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${STAGE_COLORS[deal.stage]} inline-block mb-2`}>
          {deal.deal_type}
        </span>
      )}

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
