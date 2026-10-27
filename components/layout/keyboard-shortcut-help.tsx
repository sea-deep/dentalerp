'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const DESTINATIONS = [
  { sequence: 'g d', description: 'Go to today', href: '/dashboard' },
  {
    sequence: 'g p',
    description: 'Go to patients',
    href: '/patients',
    roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  {
    sequence: 'g a',
    description: 'Go to appointments',
    href: '/appointments',
    roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  {
    sequence: 'g q',
    description: 'Go to front desk queue',
    href: '/appointments/queue',
    roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  {
    sequence: 'g b',
    description: 'Go to billing',
    href: '/billing',
    roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],
  },
  {
    sequence: 'n p',
    description: 'New patient',
    href: '/patients/new',
    roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  {
    sequence: 'n a',
    description: 'New appointment',
    href: '/appointments/new',
    roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  {
    sequence: 'n i',
    description: 'New invoice',
    href: '/billing/invoices/new',
    roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],
  },
]

export function KeyboardShortcutHelp({ role = 'RECEPTIONIST' }: { role?: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const destinations = DESTINATIONS.filter((item) => !item.roles || item.roles.includes(role))
  useEffect(() => {
    let prefix = ''
    let started = 0
    const handler = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      const typing = target?.closest(
        'input, textarea, select, [contenteditable="true"], [role="combobox"], [role="textbox"]'
      )
      const overlay = document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        typing ||
        overlay ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        prefix = ''
        return
      }
      if (event.key === '?') {
        event.preventDefault()
        setOpen(true)
        prefix = ''
        return
      }
      const key = event.key.toLowerCase()
      if (prefix && Date.now() - started < 1000) {
        const match = DESTINATIONS.find(
          (item) =>
            item.sequence === `${prefix} ${key}` && (!item.roles || item.roles.includes(role))
        )
        prefix = ''
        if (match) {
          event.preventDefault()
          router.push(match.href)
          return
        }
      }
      prefix = key === 'g' || key === 'n' ? key : ''
      started = Date.now()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router, role])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Keyboard shortcuts"
      >
        <Keyboard className="h-4 w-4" />
        <span className="hidden md:inline">Shortcuts</span>
        <kbd className="hidden rounded border px-1 md:inline">?</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Use shortcuts outside text fields. Press sequence keys within one second.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {[
              { sequence: 'Ctrl / ⌘ + K', description: 'Search patients and pages' },
              { sequence: '/', description: 'Open search' },
              ...destinations,
              { sequence: '?', description: 'Show keyboard shortcuts' },
              { sequence: 'Esc', description: 'Close a dialog or menu' },
            ].map((item) => (
              <div key={item.sequence} className="flex items-center justify-between gap-3">
                <span>{item.description}</span>
                <kbd className="shrink-0 rounded border bg-muted px-2 py-1 font-mono text-xs">
                  {item.sequence}
                </kbd>
              </div>
            ))}
          </div>
          <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
            Dental chart: arrow keys move between teeth, Enter selects, and Ctrl / ⌘ + Enter saves a
            finding.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
