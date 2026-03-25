interface PageHeaderProps {
  title: string
  description?: string
  status?: 'active' | 'coming-soon' | 'in-progress'
}

const statusStyles = {
  active: 'bg-success/10 text-success',
  'in-progress': 'bg-warning/10 text-warning',
  'coming-soon': 'bg-muted/10 text-muted',
}

const statusLabels = {
  active: 'Active',
  'in-progress': 'In Progress',
  'coming-soon': 'Coming Soon',
}

export default function PageHeader({ title, description, status }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {status && (
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusStyles[status]}`}>
            {statusLabels[status]}
          </span>
        )}
      </div>
      {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
    </div>
  )
}
