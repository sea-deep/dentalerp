'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { MobileSidebar } from './mobile-sidebar'
import { MobileNav } from './mobile-nav'
import { Header } from './header'
import { SidebarProvider } from './sidebar-context'
import { Breadcrumb } from '@/components/ui/breadcrumb'

interface DashboardShellProps {
  children: React.ReactNode
  user: {
    name: string
    email: string
    role: string
  }
  hospital?: {
    name: string
    plan: string
    logo?: string | null
  }
}

export function DashboardShell({ children, user, hospital }: DashboardShellProps) {
  const pathname = usePathname()
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [pathname])
  return (
    <SidebarProvider>
      <div className="flex h-dvh overflow-hidden">
        <a
          href="#main-content"
          className="sr-only z-[100] rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-2"
        >
          Skip to content
        </a>
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden md:flex no-print">
          <Sidebar
            role={user.role}
            hospitalName={hospital?.name}
            hospitalLogo={hospital?.logo}
            plan={hospital?.plan}
          />
        </aside>

        {/* Mobile sidebar overlay */}
        <div className="no-print">
          <MobileSidebar
            role={user.role}
            hospitalName={hospital?.name}
            hospitalLogo={hospital?.logo}
            plan={hospital?.plan}
          />
        </div>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="no-print">
            <Header user={user} />
          </div>
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-auto bg-muted/30 p-4 pb-24 md:p-6 md:pb-6 print:p-0 print:bg-white print:overflow-visible"
          >
            <div className="no-print">
              <Breadcrumb className="mb-4" />
            </div>
            {children}
          </main>
        </div>
      </div>
      <div className="no-print">
        <MobileNav role={user.role} />
      </div>
    </SidebarProvider>
  )
}
