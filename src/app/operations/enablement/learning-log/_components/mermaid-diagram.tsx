"use client"

import { useEffect, useRef, useState } from "react"

interface MermaidDiagramProps {
  chart: string
}

let mermaidInitialized = false

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            themeVariables: {
              primaryColor: "#6366f1",
              primaryTextColor: "#e5e7eb",
              primaryBorderColor: "#4f46e5",
              lineColor: "#6b7280",
              secondaryColor: "#1e1e2e",
              tertiaryColor: "#1a1a2e",
              background: "#0f1117",
              mainBkg: "#1e1e2e",
              nodeBorder: "#4f46e5",
              clusterBkg: "#1a1a2e",
              titleColor: "#e5e7eb",
              edgeLabelBackground: "#1e1e2e",
            },
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 12,
          })
          mermaidInitialized = true
        }

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
        const { svg: rendered } = await mermaid.render(id, chart.trim())
        if (!cancelled) setSvg(rendered)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render diagram")
      }
    }

    render()
    return () => { cancelled = true }
  }, [chart])

  if (error) {
    return (
      <div className="my-2 rounded-md border border-card-border bg-background/50 px-3 py-2">
        <p className="text-[10px] text-red-400 mb-1">Diagram error</p>
        <code className="text-xs font-mono text-foreground/60 whitespace-pre-wrap">{chart}</code>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-2 rounded-md border border-card-border bg-background/50 px-3 py-3 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-2 rounded-md border border-card-border bg-background/50 px-3 py-3 overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
