'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { NavigationMenu } from './navigation-menu'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSidebar } from './sidebar-context'

interface MobileSidebarProps {
  role: string
  hospitalName?: string
  hospitalLogo?: string | null
  plan?: string
}

export function MobileSidebar({ role, hospitalName, hospitalLogo }: MobileSidebarProps) {
  const pathname = usePathname()
  const { mobileOpen, setMobileOpen } = useSidebar()

  // Close on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    if (mobileOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileOpen, setMobileOpen])

  return (
    <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
      <DialogContent
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          document.querySelector<HTMLButtonElement>('[data-mobile-nav-trigger]')?.focus()
        }}
        className="inset-y-0 left-0 top-0 flex h-dvh w-[min(288px,85vw)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:rounded-none [&>button:last-child]:hidden"
      >
        <DialogTitle className="sr-only">Clinic navigation</DialogTitle>
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            {hospitalLogo ? (
              <img
                src={hospitalLogo}
                alt={hospitalName || 'Logo'}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm">
                {hospitalName ? hospitalName.charAt(0) : 'D'}
              </div>
            )}
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              {hospitalName || 'DentalERP'}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close navigation</span>
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 min-h-0">
          <NavigationMenu role={role} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
