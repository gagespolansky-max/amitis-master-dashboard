"use client"

import { useState, useEffect, useCallback } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Deal, DealStage, STAGES, STAGE_LABELS } from "@/lib/acio/types"
import DealCard from "./DealCard"
import DealPanel from "./DealPanel"
import BaselineReview from "./BaselineReview"
import { RefreshCw, Search, LayoutGrid, List, AlertCircle } from "lucide-react"

type ViewMode = "board" | "table" | "review"

export default function ACIOBoard() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("board")
  const [scanning, setScanning] = useState(false)
  const [search, setSearch] = useState("")
  const [lastScan, setLastScan] = useState<string | null>(null)

  const pendingReview = deals.filter((d) => d.status === "pending_review")
  const confirmedDeals = deals.filter((d) => d.status === "confirmed")

  const fetchDeals = useCallback(async () => {
    const res = await fetch("/api/acio/deals")
    if (res.ok) setDeals(await res.json())
  }, [])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  async function handleScan() {
    setScanning(true)
    try {
      const res = await fetch("/api/acio/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "label" }),
      })
      if (res.ok) {
        setLastScan(new Date().toISOString())
        await fetchDeals()
      }
    } finally {
      setScanning(false)
    }
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const dealId = result.draggableId
    const newStage = result.destination.droppableId as DealStage

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    )

    const res = await fetch(`/api/acio/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    })
    if (res.ok) {
      const updated = await res.json()
      setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      if (selectedDeal?.id === updated.id) setSelectedDeal(updated)
    }
  }

  function handleUpdate(updated: Deal) {
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    setSelectedDeal(updated)
  }

  function handleDelete(id: string) {
    setDeals((prev) => prev.filter((d) => d.id !== id))
    setSelectedDeal(null)
  }

  async function handleBulkConfirm(ids: string[]) {
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/acio/deals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "confirmed" }),
        })
      )
    )
    await fetchDeals()
  }

  async function handleBulkDismiss(ids: string[]) {
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/acio/deals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "dismissed" }),
        })
      )
    )
    await fetchDeals()
  }

  const filteredDeals = search
    ? confirmedDeals.filter((d) =>
        d.company_name.toLowerCase().includes(search.toLowerCase())
      )
    : confirmedDeals

  const dealsByStage = (stage: DealStage) =>
    filteredDeals.filter((d) => d.stage === stage)

  const kanbanStages: DealStage[] = ["sourced", "initial_call", "dd_in_progress", "ic_review", "committed", "passed"]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-card-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex gap-1 text-xs text-muted">
            {STAGES.filter((s) => s !== "passed").map((s) => (
              <span key={s} className="px-2 py-0.5 bg-card-bg rounded">
                {STAGE_LABELS[s]}: {dealsByStage(s).length}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pendingReview.length > 0 && viewMode !== "review" && (
            <button
              onClick={() => setViewMode("review")}
              className="text-xs px-3 py-1.5 bg-warning/20 text-warning rounded-md hover:bg-warning/30 flex items-center gap-1.5"
            >
              <AlertCircle size={14} /> {pendingReview.length} to review
            </button>
          )}

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals..."
              className="bg-card-bg border border-card-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent w-48"
            />
          </div>

          <div className="flex border border-card-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("board")}
              className={`p-1.5 ${viewMode === "board" ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 ${viewMode === "table" ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={handleScan}
            disabled={scanning}
            className="text-sm px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning..." : "Scan Now"}
          </button>

          {lastScan && (
            <span className="text-xs text-muted">
              Last: {new Date(lastScan).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "review" ? (
          <div className="p-6 overflow-y-auto h-full">
            <BaselineReview
              deals={pendingReview}
              onConfirm={handleBulkConfirm}
              onDismiss={handleBulkDismiss}
              onFinish={() => setViewMode("board")}
            />
          </div>
        ) : viewMode === "table" ? (
          <div className="p-6 overflow-y-auto h-full">
            <TableView deals={filteredDeals} onSelect={setSelectedDeal} />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 p-4 h-full overflow-x-auto">
              {kanbanStages.map((stage) => (
                <Droppable key={stage} droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`shrink-0 w-64 flex flex-col rounded-lg ${
                        snapshot.isDraggingOver ? "bg-accent/5" : "bg-column-bg"
                      }`}
                    >
                      <div className="px-3 py-2.5 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted">{STAGE_LABELS[stage]}</h3>
                        <span className="text-xs text-muted bg-card-bg px-1.5 py-0.5 rounded">
                          {dealsByStage(stage).length}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                        {dealsByStage(stage).map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <DealCard deal={deal} onClick={() => setSelectedDeal(deal)} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Slide-out panel */}
      {selectedDeal && (
        <DealPanel
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function TableView({ deals, onSelect }: { deals: Deal[]; onSelect: (d: Deal) => void }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-card-border text-left text-muted">
          <th className="pb-2 pr-4">Company</th>
          <th className="pb-2 pr-4">Type</th>
          <th className="pb-2 pr-4">Stage</th>
          <th className="pb-2 pr-4">Source</th>
          <th className="pb-2 pr-4">First Seen</th>
          <th className="pb-2">Last Updated</th>
        </tr>
      </thead>
      <tbody>
        {deals.map((deal) => (
          <tr
            key={deal.id}
            onClick={() => onSelect(deal)}
            className="border-b border-card-border/50 hover:bg-card-bg/50 cursor-pointer"
          >
            <td className="py-2.5 pr-4 font-medium">{deal.company_name}</td>
            <td className="py-2.5 pr-4 text-muted">{deal.deal_type || "—"}</td>
            <td className="py-2.5 pr-4">
              <span className="text-xs px-2 py-0.5 rounded bg-card-bg">{STAGE_LABELS[deal.stage]}</span>
            </td>
            <td className="py-2.5 pr-4 text-muted capitalize">{deal.source.replace("_", " ")}</td>
            <td className="py-2.5 pr-4 text-muted">{new Date(deal.first_seen_at).toLocaleDateString()}</td>
            <td className="py-2.5 text-muted">{new Date(deal.updated_at).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
