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
  { label: 'Dashboard', href: '/' },
  { label: 'Priorities', href: '/priorities' },
  { label: 'ACIO', href: '/acio/deals' },
  { label: 'Portfolio', href: '/portfolio/fund-returns' },
  { label: 'Investor Relations', href: '/investor-relations/marketing-collaterals' },
  { label: 'Operations', href: '/operations/enablement' },
  { label: 'Skills', href: '/skills' },
  { label: 'Research', href: '/research' },
]

interface Props {
  role: 'admin' | 'teammate'
  email: string
}

export default function Sidebar({ role, email }: Props) {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()
  const [expanded] = useState<Record<string, boolean>>({})

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className={`fixed left-0 top-0 bottom-0 bg-sidebar-bg border-r border-sidebar-border flex flex-col z-10 transition-all duration-200 ${collapsed ? 'w-12' : 'w-[var(--sidebar-width)]'}`}>
      <div className="h-[var(--header-height)] flex items-center border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <div className="flex items-center justify-between w-full px-5">
            <h1 className="text-base font-semibold tracking-tight">Command Center</h1>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <nav className="flex-1 overflow-y-auto py-3 px-3">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className={`block px-3 py-2 rounded-lg text-sm font-medium ${isActive(item.href) ? 'text-white bg-white/5' : 'text-muted hover:text-foreground hover:bg-white/5'}`}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="px-5 py-3 border-t border-sidebar-border space-y-1.5">
            <p className="text-[11px] text-muted truncate">{email}</p>
            <a href="/logout" className="inline-block text-[11px] text-muted hover:text-foreground">Sign out</a>
          </div>
        </>
      )}
    </aside>
  )
}
