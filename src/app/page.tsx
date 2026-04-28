import Link from 'next/link'

const sections = [
  {
    title: 'Today',
    items: ['Review new deals', 'Check fund returns anomalies', 'Clear top 3 priorities'],
  },
  {
    title: 'This Week',
    items: ['Prepare LP updates', 'Advance AI initiatives', 'Update learning log'],
  },
  {
    title: 'Needs Attention',
    items: ['Unreviewed returns', 'Stale deals', 'Pending skill approvals'],
  },
]

const workstreams = [
  { title: 'ACIO', href: '/acio/deals', desc: 'Deal pipeline and memos' },
  { title: 'Portfolio', href: '/portfolio/fund-returns', desc: 'Fund returns and accounting' },
  { title: 'Operations', href: '/operations/enablement', desc: 'Enablement and initiatives' },
  { title: 'Investor Relations', href: '/investor-relations/marketing-collaterals', desc: 'LP materials and comms' },
  { title: 'Priorities', href: '/priorities', desc: 'AI-ranked task board' },
  { title: 'Skills', href: '/skills', desc: 'Skills hub and marketplace' },
  { title: 'Research', href: '/research', desc: 'Fund vetting and evaluation' },
]

export default function Home() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Command Center</h1>
        <p className="mt-1.5 text-sm text-muted">
          Your operating system for Amitis. What matters now, what’s coming, and where to act.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-card-border bg-card-bg p-5">
            <h2 className="text-sm font-medium">{section.title}</h2>
            <ul className="mt-3 space-y-2">
              {section.items.map((item) => (
                <li key={item} className="text-sm text-muted">• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Workstreams</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workstreams.map((ws) => (
            <Link key={ws.title} href={ws.href} className="rounded-xl border border-card-border bg-card-bg p-5 hover:border-accent/30 transition">
              <h3 className="text-sm font-medium">{ws.title}</h3>
              <p className="mt-1 text-sm text-muted">{ws.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
