'use client'

import type { OrgPerson } from '../_lib/types'

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-400',
  incoming: 'bg-amber-400',
  external: 'bg-gray-400',
}

interface Props {
  person: OrgPerson
  isSelected?: boolean
  onClick?: () => void
}

export default function PersonNode({ person, isSelected, onClick }: Props) {
  return (
    <div
      data-person-id={person.id}
      onClick={onClick}
      className={`relative rounded-lg border px-4 py-2.5 w-[180px] text-center transition-all cursor-pointer select-none ${
        isSelected
          ? 'border-accent/50 bg-accent/8 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
      }`}
    >
      <div className="flex items-center justify-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[person.status]}`} />
        <span className="font-medium text-[11px] text-foreground whitespace-nowrap">{person.name}</span>
      </div>
      <div className="text-[9px] text-muted mt-0.5">{person.title}</div>
      {person.location && (
        <div className="text-[8px] text-muted/50 mt-0.5">{person.location}</div>
      )}
    </div>
  )
}
