'use client'

import type { TechStackItem } from '../_lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  productivity: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  development: 'bg-green-500/20 text-green-300 border-green-500/30',
  crm: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  finance: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  design: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  communication: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  data: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

const DEFAULT_COLOR = 'bg-white/10 text-muted border-white/10'

interface Props {
  items: TechStackItem[]
  onNotionClick?: () => void
}

export default function TechStackPills({ items, onNotionClick }: Props) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item) => {
        const isNotion = item.tool_name === 'Notion'
        const colorClass = CATEGORY_COLORS[item.category || ''] || DEFAULT_COLOR

        return (
          <button
            key={item.id}
            onClick={isNotion && onNotionClick ? onNotionClick : undefined}
            className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${colorClass} ${
              isNotion && onNotionClick
                ? 'cursor-pointer hover:ring-1 hover:ring-accent'
                : 'cursor-default'
            }`}
          >
            {item.tool_name}
          </button>
        )
      })}
    </div>
  )
}
