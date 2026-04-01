'use client'

import { useCallback, useState, useRef } from 'react'

interface ScreenshotDropzoneProps {
  onFileDropped: (file: File) => void
  isProcessing: boolean
}

export default function ScreenshotDropzone({ onFileDropped, isProcessing }: ScreenshotDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        onFileDropped(file)
      }
    },
    [onFileDropped]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onFileDropped(file)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
        isDragOver
          ? 'border-accent bg-accent/10'
          : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
      } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      {isProcessing ? (
        <div className="space-y-2">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted">Processing screenshot...</p>
        </div>
      ) : (
        <div className="space-y-2">
          <svg className="w-8 h-8 mx-auto text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-muted">Drop a screenshot here or click to upload</p>
          <p className="text-xs text-muted/60">PNG, JPG, WEBP</p>
        </div>
      )}
    </div>
  )
}
