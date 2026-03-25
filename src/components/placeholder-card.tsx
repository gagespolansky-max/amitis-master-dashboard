interface PlaceholderCardProps {
  title: string
  description: string
  items?: string[]
}

export default function PlaceholderCard({ title, description, items }: PlaceholderCardProps) {
  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-6">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted">{description}</p>
      {items && items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-card-border" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
