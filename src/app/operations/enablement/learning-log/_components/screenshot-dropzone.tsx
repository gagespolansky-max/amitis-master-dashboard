"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, Loader2, ImageIcon, X, Plus, Sparkles } from "lucide-react"
import { LearningLogEntry } from "../_lib/learning-log-types"

interface ScreenshotDropzoneProps {
  isDragOver: boolean
  isProcessing: boolean
  onDragStateChange: (isDragging: boolean) => void
  onScreenshotProcessed: (entry: LearningLogEntry) => void
  onProcessingChange: (processing: boolean) => void
}

interface StagedFile {
  file: File
  previewUrl: string
}

export default function ScreenshotDropzone({
  isDragOver,
  isProcessing,
  onDragStateChange,
  onScreenshotProcessed,
  onProcessingChange,
}: ScreenshotDropzoneProps) {
  const [staged, setStaged] = useState<StagedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add files to the staging area (from drop or file picker)
  const stageFiles = useCallback((files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"))
    if (images.length === 0) return

    const newStaged = images.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setStaged((prev) => [...prev, ...newStaged])
  }, [])

  // Remove a staged file
  function removeStaged(index: number) {
    setStaged((prev) => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Clear all staged files
  function clearStaged() {
    staged.forEach((s) => URL.revokeObjectURL(s.previewUrl))
    setStaged([])
  }

  // Process all staged files
  async function handleProcess() {
    if (staged.length === 0) return

    onProcessingChange(true)
    try {
      const formData = new FormData()
      for (const { file } of staged) {
        formData.append("image", file)
      }

      const res = await fetch(
        "/operations/enablement/learning-log/api/screenshot",
        { method: "POST", body: formData }
      )

      if (res.ok) {
        const entry: LearningLogEntry = await res.json()
        onScreenshotProcessed(entry)
      }
    } finally {
      onProcessingChange(false)
      clearStaged()
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onDragStateChange(false)
      stageFiles(Array.from(e.dataTransfer.files))
    },
    [onDragStateChange, stageFiles]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onDragStateChange(true)
    },
    [onDragStateChange]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onDragStateChange(false)
    },
    [onDragStateChange]
  )

  // Processing state
  if (isProcessing) {
    return (
      <div className="border border-accent/50 bg-accent/5 rounded-lg p-4 flex items-center gap-4">
        <div className="flex gap-2 flex-wrap">
          {staged.map((s, i) => (
            <img
              key={i}
              src={s.previewUrl}
              alt={`Processing ${i + 1}`}
              className="w-16 h-16 object-cover rounded-md border border-card-border"
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-accent" />
          <span className="text-sm text-foreground/80">
            Analyzing {staged.length} screenshot{staged.length !== 1 ? "s" : ""} with Claude...
          </span>
        </div>
      </div>
    )
  }

  // Staging area — files queued, waiting for user to process
  if (staged.length > 0) {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border rounded-lg p-4 space-y-3 transition-all ${
          isDragOver ? "border-accent bg-accent/10" : "border-accent/40 bg-accent/5"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground/80">
            {staged.length} screenshot{staged.length !== 1 ? "s" : ""} staged
          </span>
          <button
            onClick={clearStaged}
            className="text-xs text-muted hover:text-red-400"
          >
            Clear all
          </button>
        </div>

        {/* Thumbnail grid */}
        <div className="flex gap-2 flex-wrap">
          {staged.map((s, i) => (
            <div key={i} className="relative group">
              <img
                src={s.previewUrl}
                alt={`Staged ${i + 1}`}
                className="w-20 h-20 object-cover rounded-md border border-card-border"
              />
              <button
                onClick={() => removeStaged(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {/* Add more button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-md border border-dashed border-card-border flex flex-col items-center justify-center gap-1 text-muted hover:text-foreground hover:border-accent transition-colors"
          >
            <Plus size={16} />
            <span className="text-[10px]">Add more</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) stageFiles(Array.from(e.target.files))
            e.target.value = ""
          }}
        />

        {/* Drop hint */}
        <p className="text-[10px] text-muted">
          Drop more screenshots or click + to add. When ready, hit Process.
        </p>

        {/* Process button */}
        <button
          onClick={handleProcess}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Sparkles size={14} />
          Process {staged.length} screenshot{staged.length !== 1 ? "s" : ""} with Claude
        </button>
      </div>
    )
  }

  // Default drop target
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`border rounded-lg transition-all cursor-pointer ${
        isDragOver
          ? "border-accent bg-accent/10 p-6"
          : "border-dashed border-card-border p-3 hover:border-accent/50"
      }`}
    >
      <div className="flex items-center justify-center gap-2 text-muted">
        {isDragOver ? (
          <>
            <Upload size={20} className="text-accent" />
            <span className="text-sm text-accent">Drop screenshot(s) here</span>
          </>
        ) : (
          <>
            <ImageIcon size={14} />
            <span className="text-xs">
              Drag screenshots here to extract a learning entry
            </span>
          </>
        )}
      </div>
    </div>
  )
}
