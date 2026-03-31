"use client"

import { useState } from "react"
import { DealStage, STAGES, STAGE_LABELS, STAGE_COLORS } from "@/lib/acio/types"

const PIPELINE_STAGES: DealStage[] = ["sourced", "initial_call", "dd_in_progress", "ic_review", "committed"]

interface StageProgressBarProps {
  stage: DealStage
  stageUpdatedAt: string
  onStageChange?: (stage: DealStage) => void
  compact?: boolean
}

export default function StageProgressBar({ stage, stageUpdatedAt, onStageChange, compact }: StageProgressBarProps) {
  const [hoveredStage, setHoveredStage] = useState<DealStage | null>(null)

  const isPassed = stage === "passed"
  const currentIndex = PIPELINE_STAGES.indexOf(stage)

  if (compact) {
    return (
      <div className="flex gap-0.5 w-full">
        {PIPELINE_STAGES.map((s, i) => {
          const filled = !isPassed && i <= currentIndex
          return (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${filled ? "bg-accent" : "bg-card-border"} ${isPassed ? "bg-red-500/30" : ""}`}
            />
          )
        })}
      </div>
    )
  }

  const daysInStage = Math.floor((Date.now() - new Date(stageUpdatedAt).getTime()) / 86400000)

  return (
    <div className="space-y-2">
      <div className="flex gap-1 relative">
        {PIPELINE_STAGES.map((s, i) => {
          const filled = !isPassed && i <= currentIndex
          const isCurrent = s === stage
          return (
            <div key={s} className="flex-1 relative">
              <button
                onClick={() => onStageChange?.(s)}
                onMouseEnter={() => setHoveredStage(s)}
                onMouseLeave={() => setHoveredStage(null)}
                className={`w-full h-2.5 rounded-sm transition-all ${
                  filled
                    ? isCurrent
                      ? "bg-accent ring-1 ring-accent/50"
                      : "bg-accent/60"
                    : "bg-card-border hover:bg-card-border/80"
                } ${onStageChange ? "cursor-pointer" : ""}`}
              />
              {hoveredStage === s && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border border-card-border rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap z-10 shadow-lg">
                  <div className="font-medium">{STAGE_LABELS[s]}</div>
                  {isCurrent && (
                    <div className="text-muted">{daysInStage}d in stage</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Passed branch-off */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{STAGE_LABELS[stage]}</span>
          <span className="text-xs text-muted/50">{daysInStage}d</span>
        </div>
        <button
          onClick={() => onStageChange?.(isPassed ? "sourced" : "passed")}
          className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${
            isPassed
              ? "bg-red-500/20 text-red-400 border-red-500/30"
              : "border-card-border text-muted hover:text-red-400 hover:border-red-500/30"
          }`}
        >
          {isPassed ? "Passed" : "Pass"}
        </button>
      </div>
    </div>
  )
}
