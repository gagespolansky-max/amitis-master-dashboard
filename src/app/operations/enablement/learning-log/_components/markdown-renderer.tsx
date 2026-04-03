"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import MermaidDiagram from "./mermaid-diagram"

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-foreground mt-3 mb-1.5">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-foreground mt-2 mb-1">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-foreground/80 mb-2 leading-relaxed">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/70">{children}</em>
        ),
        code: ({ className, children }) => {
          const isMermaid = className?.includes("language-mermaid")
          if (isMermaid) {
            const chart = String(children).replace(/\n$/, "")
            return <MermaidDiagram chart={chart} />
          }

          const isBlock = className?.includes("language-")
          if (isBlock) {
            return (
              <code className="block bg-background/50 border border-card-border rounded-md px-3 py-2 text-xs font-mono text-foreground/90 overflow-x-auto my-2 whitespace-pre">
                {children}
              </code>
            )
          }
          return (
            <code className="bg-background/50 border border-card-border rounded px-1.5 py-0.5 text-xs font-mono text-foreground/90">
              {children}
            </code>
          )
        },
        pre: ({ children }) => <div className="my-2">{children}</div>,
        ul: ({ children }) => (
          <ul className="list-disc list-inside text-sm text-foreground/80 mb-2 space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside text-sm text-foreground/80 mb-2 space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-accent/50 pl-3 my-2 text-sm text-foreground/60 italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-xs border-collapse w-full">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-card-border px-2 py-1 text-left font-semibold bg-background/50">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-card-border px-2 py-1">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
