'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  Command,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  Loader2,
  Package,
  Pill,
  Plus,
  Receipt,
  Search,
  Stethoscope,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { getNavigationForRole } from '@/config/nav'
import { cn } from '@/lib/utils'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'

interface SearchResult {
  id: string
  label: string
  sublabel: string
  href: string
}

interface SearchResults {
  patients: SearchResult[]
  appointments: SearchResult[]
  invoices: SearchResult[]
  staff: SearchResult[]
  treatments: SearchResult[]
  medicines: SearchResult[]
}

interface PaletteItem {
  id: string
  label: string
  sublabel?: string
  href: string
  icon: LucideIcon
  group?: string
}

type Action = PaletteItem & { roles?: string[] }

const ACTIONS: Action[] = [
  {
    id: 'new-patient',
    label: 'New patient',
    sublabel: 'Register a walk-in or new case',
    href: '/patients/new',
    icon: Plus,
  },
  {
    id: 'book-appointment',
    label: 'Book appointment',
    sublabel: 'Find a slot and confirm a visit',
    href: '/appointments/new',
    icon: Calendar,
  },
  {
    id: 'new-prescription',
    label: 'New prescription',
    sublabel: 'Write an e-prescription',
    href: '/prescriptions/new',
    icon: ClipboardList,
    roles: ['ADMIN', 'DOCTOR'],
  },
  {
    id: 'new-invoice',
    label: 'Create invoice',
    sublabel: 'Bill a patient with GST',
    href: '/billing/invoices/new',
    icon: Receipt,
    roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],
  },
  {
    id: 'new-treatment',
    label: 'Add treatment',
    sublabel: 'Record a procedure',
    href: '/treatments/new',
    icon: Stethoscope,
    roles: ['ADMIN', 'DOCTOR'],
  },
  {
    id: 'new-lab-order',
    label: 'New lab order',
    sublabel: 'Send a sample to the lab',
    href: '/lab/orders/new',
    icon: FlaskConical,
    roles: ['ADMIN', 'DOCTOR', 'LAB_TECH'],
  },
  {
    id: 'new-stock-item',
    label: 'Add stock item',
    sublabel: 'Create an inventory item',
    href: '/inventory/new',
    icon: Package,
    roles: ['ADMIN'],
  },
  {
    id: 'new-staff',
    label: 'Add team member',
    sublabel: 'Invite a doctor or front desk',
    href: '/staff/new',
    icon: UserCog,
    roles: ['ADMIN'],
  },
  {
    id: 'queue',
    label: 'Front desk queue',
    sublabel: 'Check in and manage the waiting room',
    href: '/appointments/queue',
    icon: Users,
    roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'],
  },
  {
    id: 'medicines',
    label: 'Medicine library',
    sublabel: 'Search 2.5 lakh Indian brands',
    href: '/medications',
    icon: Pill,
    roles: ['ADMIN', 'DOCTOR'],
  },
  {
    id: 'record-payment',
    label: 'Record a payment',
    sublabel: 'Collect against an invoice',
    href: '/billing/payments',
    icon: CreditCard,
    roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],
  },
]

const RESULT_GROUPS: Array<{ key: keyof SearchResults; label: string; icon: LucideIcon }> = [
  { key: 'patients', label: 'Patients', icon: Users },
  { key: 'medicines', label: 'Medicines', icon: Pill },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'treatments', label: 'Treatments', icon: Stethoscope },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'staff', label: 'Team', icon: UserCog },
]

const EMPTY_RESULTS: SearchResults = {
  patients: [],
  appointments: [],
  invoices: [],
  staff: [],
  treatments: [],
  medicines: [],
}

export function GlobalSearch({ role = 'ADMIN' }: { role?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const requestRef = useRef(0)

  const actions = useMemo(
    () => ACTIONS.filter((action) => !action.roles || action.roles.includes(role)),
    [role]
  )

  const pages = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = []
    const seen = new Set<string>()
    const push = (item: PaletteItem) => {
      if (seen.has(item.href)) return
      seen.add(item.href)
      items.push(item)
    }
    for (const section of getNavigationForRole(role)) {
      for (const item of section.items) {
        push({
          id: `page-${section.title}-${item.href}`,
          label: item.title,
          sublabel: section.title,
          href: item.href,
          icon: item.icon,
          group: 'Go to',
        })
        for (const subItem of item.subItems || []) {
          push({
            id: `page-${section.title}-${item.title}-${subItem.href}`,
            label: subItem.title,
            sublabel: `${section.title} · ${item.title}`,
            href: subItem.href,
            icon: subItem.icon,
            group: 'Go to',
          })
        }
      }
    }
    return items
  }, [role])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredActions = useMemo(() => {
    if (!normalizedQuery) return actions
    return actions.filter(
      (action) =>
        action.label.toLowerCase().includes(normalizedQuery) ||
        (action.sublabel || '').toLowerCase().includes(normalizedQuery)
    )
  }, [actions, normalizedQuery])

  const filteredPages = useMemo(() => {
    if (!normalizedQuery) return pages.slice(0, 8)
    return pages
      .filter(
        (page) =>
          page.label.toLowerCase().includes(normalizedQuery) ||
          (page.sublabel || '').toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 8)
  }, [pages, normalizedQuery])

  const resultItems = useMemo<PaletteItem[]>(() => {
    if (normalizedQuery.length < 2) return []
    return RESULT_GROUPS.flatMap((group) =>
      (results[group.key] || []).map((result) => ({
        id: `${group.key}-${result.id}`,
        label: result.label,
        sublabel: result.sublabel,
        href: result.href,
        icon: group.icon,
        group: group.label,
      }))
    )
  }, [results, normalizedQuery])

  const flatItems = useMemo(
    () => [...filteredActions, ...filteredPages, ...resultItems],
    [filteredActions, filteredPages, resultItems]
  )

  // ⌘K / Ctrl+K and "/" open the palette.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return
      const target = event.target instanceof HTMLElement ? event.target : null
      const typing = target?.closest(
        'input, textarea, select, [contenteditable="true"], [role="combobox"]'
      )
      if (!open && document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]'))
        return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
        return
      }
      if (
        event.key === '/' &&
        !typing &&
        !open &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      requestRef.current++
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setQuery('')
      setResults(EMPTY_RESULTS)
      setActiveIndex(0)
      setLoading(false)
      setSearchError(false)
    }
  }, [open])

  useEffect(
    () => () => {
      requestRef.current++
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    []
  )

  useEffect(() => {
    resultsRef.current
      ?.querySelector<HTMLElement>(`[data-palette-index="${activeIndex}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const runSearch = useCallback(async (value: string) => {
    const requestId = ++requestRef.current
    setLoading(true)
    setSearchError(false)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`)
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      if (requestId !== requestRef.current) return
      setResults({ ...EMPTY_RESULTS, ...data })
    } catch {
      if (requestId === requestRef.current) {
        setResults(EMPTY_RESULTS)
        setSearchError(true)
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [])

  const handleQueryChange = (value: string) => {
    requestRef.current++
    setQuery(value)
    setSearchError(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length >= 2) {
      setLoading(true)
      debounceRef.current = setTimeout(() => runSearch(value.trim()), 240)
    } else {
      setResults(EMPTY_RESULTS)
      setLoading(false)
    }
  }

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (flatItems.length ? (index + 1) % flatItems.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) =>
        flatItems.length ? (index - 1 + flatItems.length) % flatItems.length : 0
      )
    } else if (event.key === 'Enter') {
      const item = flatItems[activeIndex]
      if (item) {
        event.preventDefault()
        navigate(item.href)
      }
    }
  }

  // Assign stable indexes while rendering grouped sections.
  let cursor = -1
  const renderGroup = (title: string, items: PaletteItem[], icon: LucideIcon) => {
    if (items.length === 0) return null
    const GroupIcon = icon
    return (
      <div key={title} className="py-1">
        <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <GroupIcon className="h-3.5 w-3.5" />
          {title}
        </div>
        {items.map((item) => {
          cursor += 1
          const index = cursor
          const Icon = item.icon
          const active = index === activeIndex
          return (
            <button
              key={item.id}
              data-palette-index={index}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => navigate(item.href)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                active ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                  active
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'bg-muted/50 text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.label}</span>
                {item.sublabel && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.sublabel}
                  </span>
                )}
              </span>
              <ArrowRight
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-opacity',
                  active ? 'opacity-100' : 'opacity-0'
                )}
              />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="flex-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search patients, medicines, actions…</span>
          <kbd className="pointer-events-none hidden items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[4%] mx-2 max-w-2xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-[12%] sm:mx-auto">
          <VisuallyHidden.Root>
            <DialogTitle>Search and quick actions</DialogTitle>
          </VisuallyHidden.Root>

          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              aria-label="Search records and pages"
              type="text"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search patients, medicines, invoices or jump to a page…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
            <kbd className="hidden rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              esc
            </kbd>
          </div>

          <div ref={resultsRef} className="max-h-[65vh] overflow-y-auto">
            {searchError && (
              <div role="alert" className="border-b px-4 py-3 text-sm text-destructive">
                Record search is unavailable. Try again; page navigation and quick actions still
                work.
              </div>
            )}
            {normalizedQuery.length === 0 && (
              <div className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                Type at least 2 characters to search a name, phone, invoice number or medicine.
                Everything is one keystroke away.
              </div>
            )}

            {normalizedQuery.length === 1 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </div>
            )}

            {normalizedQuery.length >= 2 && !loading && !searchError && flatItems.length === 0 && (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-3 font-medium">No results found for “{query.trim()}”</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a phone number, a generic medicine name, or a shorter spelling.
                </p>
              </div>
            )}

            {normalizedQuery.length >= 2 && !loading && resultItems.length > 0 && (
              <div className="border-b bg-muted/20 px-4 py-1.5 text-[11px] font-medium text-muted-foreground">
                {resultItems.length} {resultItems.length === 1 ? 'result' : 'results'}
              </div>
            )}

            {renderGroup('Quick actions', filteredActions, Plus)}
            {renderGroup('Go to', filteredPages, LayoutDashboard)}
            {RESULT_GROUPS.map((group) => {
              const items = resultItems.filter((item) => item.group === group.label)
              return renderGroup(group.label, items, group.icon)
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded border px-1 py-0.5 font-mono">↑</kbd>
              <kbd className="rounded border px-1 py-0.5 font-mono">↓</kbd>
              navigate
              <kbd className="ml-2 rounded border px-1 py-0.5 font-mono">↵</kbd>
              open
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border px-1 py-0.5 font-mono">⌘K</kbd>
              anywhere
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
