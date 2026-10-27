'use client'

import Link from 'next/link'
import {
  Calendar,
  ClipboardList,
  FlaskConical,
  Package,
  Plus,
  Receipt,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ITEMS = [
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
  {
    label: 'Add treatment',
    href: '/treatments/new',
    icon: Stethoscope,
    roles: ['ADMIN', 'DOCTOR'],
  },
  {
    label: 'New lab order',
    href: '/lab/orders/new',
    icon: FlaskConical,
    roles: ['ADMIN', 'DOCTOR', 'LAB_TECH'],
  },
  { label: 'Add stock item', href: '/inventory/new', icon: Package, roles: ['ADMIN'] },
  { label: 'Invite team member', href: '/staff/new', icon: UserCog, roles: ['ADMIN'] },
]

export function QuickCreate({ role }: { role: string }) {
  const items = ITEMS.filter((item) => item.roles.includes(role))
  if (items.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-9 gap-1.5" aria-label="Quick actions">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick create</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => {
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
  )
}
