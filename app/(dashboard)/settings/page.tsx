'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  ArrowRight,
  Building2,
  Calendar,
  Receipt,
  MessageSquare,
  Database,
  Users,
  Shield,
  Link2,
  Sun,
  Moon,
  Monitor,
  Upload,
  BookOpen,
  Languages,
  Stethoscope,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const groups = [
  {
    title: 'Your clinic',
    description: 'Make the workspace fit how your clinic operates.',
    items: [
      {
        title: 'Clinic website',
        detail: 'Clinic page, gallery, before and after photos and patient reviews',
        href: '/settings/website',
        icon: Building2,
      },
      {
        title: 'Clinical reference lists',
        detail: 'Saved complaints, findings, diagnoses and advice',
        href: '/settings/clinical-references',
        icon: ClipboardList,
      },
      {
        title: 'Clinic identity',
        detail: 'Name, contact details, logo and invoice branding',
        href: '/settings/clinic',
        icon: Building2,
      },
      {
        title: 'Appointment rules',
        detail: 'Working hours, slot duration and booking preferences',
        href: '/settings/appointments',
        icon: Calendar,
      },
      {
        title: 'Procedures and fees',
        detail: 'Your procedure catalogue, default prices and durations',
        href: '/settings/procedures',
        icon: Stethoscope,
      },
      {
        title: 'Billing preferences',
        detail: 'Invoice numbering, tax settings and payment terms',
        href: '/settings/billing',
        icon: Receipt,
      },
      {
        title: 'Patient forms',
        detail: 'Configure intake forms and consent templates',
        href: '/settings/forms',
        icon: ClipboardList,
      },
    ],
  },
  {
    title: 'People and access',
    description: 'Give each team member their own account and role.',
    items: [
      {
        title: 'Staff module access',
        detail: 'Control the modules each person can open',
        href: '/settings/access',
        icon: Shield,
      },
      {
        title: 'Staff accounts',
        detail: 'Manage dentists, reception, accounts and lab staff',
        href: '/staff',
        icon: Users,
      },
      {
        title: 'Team invitations',
        detail: 'Review pending invitations and onboarding',
        href: '/staff/invites',
        icon: Users,
      },
      {
        title: 'Security',
        detail: 'Review security settings and access policies',
        href: '/settings/security',
        icon: Shield,
      },
      {
        title: 'My preferences',
        detail: 'Your language and regional formatting',
        href: '/settings/profile',
        icon: Languages,
      },
    ],
  },
  {
    title: 'Communication and data',
    description: 'Connect services and manage clinic records.',
    items: [
      {
        title: 'WhatsApp Business',
        detail: 'Connection, approved templates and automated messages',
        href: '/settings/whatsapp',
        icon: MessageSquare,
      },
      {
        title: 'Patient communications',
        detail: 'Email, SMS and notification settings',
        href: '/settings/communications',
        icon: MessageSquare,
      },
      {
        title: 'Integrations',
        detail: 'Configure external services for your clinic',
        href: '/settings/integrations',
        icon: Link2,
      },
      {
        title: 'Import records',
        detail: 'Map and import data from an existing system',
        href: '/settings/import',
        icon: Upload,
      },
      {
        title: 'System and exports',
        detail: 'System information, data export and backup settings',
        href: '/settings/system',
        icon: Database,
      },
    ],
  },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clinic settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your clinic’s workflow, team and preferences, in one place.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings/setup-guide">
            <BookOpen className="mr-2 h-4 w-4" />
            Setup guide
          </Link>
        </Button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="space-y-1 lg:sticky lg:top-0 lg:self-start">
          {groups.map((group, index) => (
            <a
              key={group.title}
              href={`#settings-${index}`}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {group.title}
            </a>
          ))}
          <a
            href="#appearance"
            className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Appearance
          </a>
        </nav>
        <div className="space-y-8">
          {groups.map((group, index) => (
            <section id={`settings-${index}`} key={group.title} className="scroll-mt-5">
              <h2 className="text-base font-semibold">{group.title}</h2>
              <p className="mb-4 mt-1 text-xs text-muted-foreground">{group.description}</p>
              <div className="divide-y overflow-hidden rounded-lg border bg-card">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50"
                  >
                    <item.icon
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {item.detail}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
          <section id="appearance" className="scroll-mt-5">
            <h2 className="text-base font-semibold">Appearance</h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Choose a comfortable theme for this browser.
            </p>
            <div className="flex flex-wrap gap-3 rounded-lg border bg-card p-4">
              {(
                [
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ] as const
              ).map((option) => (
                <Button
                  key={option.value}
                  variant={mounted && theme === option.value ? 'default' : 'outline'}
                  aria-pressed={mounted ? theme === option.value : undefined}
                  onClick={() => setTheme(option.value)}
                >
                  <option.icon className="mr-2 h-4 w-4" />
                  {option.label}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
