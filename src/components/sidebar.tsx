'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSidebar } from './sidebar-layout'

interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    label: 'OIG',
    href: '/oig/cos',
  },
  {
    label: 'Priorities',
    href: '/priorities',
    children: [
      { label: 'Board', href: '/priorities' },
      { label: 'Gage', href: '/priorities/gage' },
    ],
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    children: [
      { label: 'Fund Returns', href: '/portfolio/fund-returns' },
      { label: 'Fund Accounting', href: '/portfolio/fund-accounting' },
    ],
  },
  {
    label: 'Investor Relations',
    href: '/investor-relations',
    children: [
      { label: 'One Pagers', href: '/investor-relations/one-pagers' },
      { label: 'Marketing Collaterals', href: '/investor-relations/marketing-collaterals' },
      { label: 'Market Newsletters', href: '/investor-relations/newsletters' },
      { label: 'X Posts', href: '/investor-relations/x-posts' },
    ],
  },
  {
    label: 'Research',
    href: '/research',
  },
  {
    label: 'ACIO',
    href: '/acio',
    children: [
      { label: 'Deal Pipeline', href: '/acio/deals' },
      { label: 'Investment Memos', href: '/acio/investment-memos' },
    ],
  },
  {
    label: 'Skills Hub',
    href: '/skills',
    children: [
      { label: 'Hub', href: '/skills' },
      { label: 'Admin', href: '/skills/admin/system-directory' },
    ],
  },
  {
    label: 'Operations',
    href: '/operations',
    children: [
      { label: 'Organization', href: '/operations/organization' },
      { label: 'AI Initiatives', href: '/operations/ai-initiatives' },
      { label: 'Enablement', href: '/operations/enablement' },
      { label: 'Learning Log', href: '/operations/enablement/learning-log' },
    ],
  },
]

const TEAMMATE_VISIBLE_HREFS = new Set(['/acio'])

interface Props {
  role: 'admin' | 'teammate'
  email: string
}

export default function Sidebar({ role, email }: Props) {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()
  const visibleNavigation =
    role === 'admin' ? navigation : navigation.filter((item) => TEAMMATE_VISIBLE_HREFS.has(item.href))
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    visibleNavigation.forEach((item) => {
      if (item.children && (pathname.startsWith(item.href) || role !== 'admin')) {
        initial[item.href] = true
      }
    })
    return initial
  })

  function toggleNav(href: string) {
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }))
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 bg-sidebar-bg border-r border-sidebar-border flex flex-col z-10 transition-all duration-200 ${
        collapsed ? 'w-12' : 'w-[var(--sidebar-width)]'
      }`}
    >
      <div className="h-[var(--header-height)] flex items-center border-b border-sidebar-border shrink-0">
        {collapsed ? (
          <button
            onClick={toggle}
            className="w-full flex items-center justify-center py-2 text-muted hover:text-foreground transition-colors"
            title="Expand sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center justify-between w-full px-5">
            <h1 className="text-base font-semibold tracking-tight">Master Dashboard</h1>
            <button
              onClick={toggle}
              className="text-muted hover:text-foreground transition-colors"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <nav className="flex-1 overflow-y-auto py-3 px-3">
            {visibleNavigation.map((item) => (
              <div key={item.href} className="mb-1">
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleNav(item.href)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'text-white bg-white/5'
                          : 'text-muted hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                      <svg
                        className={`w-4 h-4 transition-transform ${expanded[item.href] ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {expanded[item.href] && (
                      <div className="ml-3 mt-1 space-y-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                              pathname === child.href
                                ? 'text-accent font-medium'
                                : 'text-muted hover:text-foreground'
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'text-white bg-white/5'
                        : 'text-muted hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          <div className="px-5 py-3 border-t border-sidebar-border space-y-1.5">
            <p className="text-[11px] text-muted truncate" title={email}>{email}</p>
            <a
              href="/logout"
              className="inline-block text-[11px] text-muted hover:text-foreground transition-colors"
            >
              Sign out
            </a>
            <p className="text-[10px] text-muted/50 pt-1">v0.1.0</p>
          </div>
        </>
      )}
    </aside>
  )
}
