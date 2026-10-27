'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { getNavigationForRole, type NavItem } from '@/config/nav'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const DAILY = [
  '/dashboard',
  '/appointments',
  '/patients',
  '/treatments',
  '/prescriptions',
  '/billing',
]

function NavigationItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
  const [expanded, setExpanded] = useState<boolean | null>(null)
  const open = expanded ?? active
  const Icon = item.icon
  const children = item.subItems?.filter((child) => child.href !== item.href) || []
  const row = (
    <Link
      href={item.href}
      aria-label={item.title}
      aria-current={pathname === item.href ? 'page' : undefined}
      className={cn(
        'flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {!collapsed && (
        <span className="truncate">{item.title === 'Dashboard' ? 'Today' : item.title}</span>
      )}
      {!collapsed && item.badge && (
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[11px] tabular-nums">
          {item.badge}
        </span>
      )}
    </Link>
  )
  if (collapsed)
    return (
      <Tooltip>
        <TooltipTrigger asChild>{row}</TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    )
  return (
    <div>
      <div className="flex items-center gap-1">
        {row}
        {children.length > 0 && (
          <button
            type="button"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${item.title}`}
            aria-expanded={open}
            aria-controls={`nav-${item.href.slice(1)}`}
            onClick={() => setExpanded(!open)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
            />
          </button>
        )}
      </div>
      {children.length > 0 && open && (
        <div id={`nav-${item.href.slice(1)}`} className="ml-5 mt-1 space-y-0.5 border-l pl-3">
          {children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              aria-current={pathname === child.href ? 'page' : undefined}
              className={cn(
                'flex min-h-9 items-center rounded-md px-2 text-xs transition-colors',
                pathname === child.href
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {child.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function NavigationMenu({ role, collapsed = false }: { role: string; collapsed?: boolean }) {
  const pathname = usePathname()
  const [toolsExpanded, setToolsExpanded] = useState<boolean | null>(null)
  const sections = getNavigationForRole(role)
  const allItems = sections.flatMap((section) => section.items)
  const daily = DAILY.flatMap((href) => allItems.filter((item) => item.href === href))
  const remaining = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !DAILY.includes(item.href)),
    }))
    .filter((section) => section.items.length)
  const administration = remaining.filter((section) => section.title === 'Administration')
  const tools = remaining.filter((section) => section.title !== 'Administration')
  const activeTool = tools.some((section) =>
    section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
  )
  const showTools = toolsExpanded ?? activeTool
  return (
    <nav
      aria-label="Clinic navigation"
      className={cn('space-y-5 py-4', collapsed ? 'px-2' : 'px-3')}
    >
      {[{ title: 'Daily practice', items: daily }, ...administration].map((section) => (
        <div key={section.title}>
          {!collapsed && (
            <h2 className="mb-2 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground">
              {section.title}
            </h2>
          )}
          <div className="space-y-1">
            {section.items.map((item) => (
              <NavigationItem key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        </div>
      ))}
      {tools.length > 0 && (
        <div className="border-t pt-3">
          {!collapsed && (
            <button
              type="button"
              aria-expanded={showTools}
              onClick={() => setToolsExpanded(!showTools)}
              className="flex min-h-10 w-full items-center justify-between rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              More clinic tools
              <ChevronDown className={cn('h-4 w-4', showTools && 'rotate-180')} />
            </button>
          )}
          {(collapsed || showTools) &&
            tools.map((section) => (
              <div key={section.title} className="mt-3">
                {!collapsed && (
                  <h2 className="mb-2 px-3 text-[11px] font-semibold text-muted-foreground">
                    {section.title}
                  </h2>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavigationItem key={item.href} item={item} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </nav>
  )
}
