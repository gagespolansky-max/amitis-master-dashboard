import Link from 'next/link'
import PriorityBoard from '@/components/priority-board'

const workstreams = [
  {
    title: 'Portfolio',
    description: 'Fund returns tracking and accounting',
    href: '/portfolio/fund-returns',
    status: 'in-progress' as const,
    items: ['Fund Returns Dashboard', 'Fund Accounting'],
  },
  {
    title: 'Investor Relations',
    description: 'One pagers, newsletters, and LP communications',
    href: '/investor-relations',
    status: 'coming-soon' as const,
    items: ['One Pagers', 'Market Newsletters'],
  },
  {
    title: 'Research',
    description: 'Fund vetting, deal evaluation, and pipeline',
    href: '/research',
    status: 'coming-soon' as const,
    items: ['Fund Vetting', 'Deal Evaluation'],
  },
  {
    title: 'Operations',
    description: 'AI initiatives and enablement',
    href: '/operations/enablement',
    status: 'in-progress' as const,
    items: ['AI Initiatives', 'Enablement'],
  },
]

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

export default function Home() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted">Your workstreams at a glance.</p>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-4">Priorities</h2>
        <PriorityBoard />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Workstreams</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workstreams.map((ws) => (
            <Link
              key={ws.title}
              href={ws.href}
              className="group rounded-xl border border-card-border bg-card-bg p-6 transition-colors hover:border-accent/30"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-medium group-hover:text-accent transition-colors">
                  {ws.title}
                </h2>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusStyles[ws.status]}`}>
                  {statusLabels[ws.status]}
                </span>
              </div>
              <p className="text-sm text-muted mb-4">{ws.description}</p>
              <ul className="space-y-1.5">
                {ws.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-card-border" />
                    {item}
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
