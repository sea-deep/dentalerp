'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, ClipboardList, Home, Menu, Plus, Receipt, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebar } from './sidebar-context'

const TABS = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Patients', href: '/patients', icon: Users },
  { label: 'Calendar', href: '/appointments', icon: Calendar },
]

const CREATE_ITEMS = [
  {
    label: 'New patient',
    href: '/patients/new',
    icon: Users,
    roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'],
  },
  {
    label: 'Book appointment',
    href: '/appointments/new',
    icon: Calendar,
    roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'],
  },
  {
    label: 'New prescription',
    href: '/prescriptions/new',
    icon: ClipboardList,
    roles: ['ADMIN', 'DOCTOR'],
  },
  {
    label: 'Create invoice',
    href: '/billing/invoices/new',
    icon: Receipt,
    roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],
  },
]

export function MobileNav({ role }: { role: string }) {
  const pathname = usePathname()
  const { setMobileOpen } = useSidebar()

  const createItems = CREATE_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active =
            pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'fill-primary/10')} />
              {tab.label}
            </Link>
          )
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mx-auto -mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95"
              aria-label="Create new"
            >
              <Plus className="h-7 w-7" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className="mb-2 w-56">
            <DropdownMenuLabel>Quick create</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {createItems.map((item) => {
              const Icon = item.icon
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex cursor-pointer items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </div>
    </nav>
  )
}
