'use client'

import Link from 'next/link'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NavigationMenu } from './navigation-menu'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSidebar } from './sidebar-context'

interface SidebarProps {
  role: string
  hospitalName?: string
  hospitalLogo?: string | null
  plan?: string
}

export function Sidebar({ role, hospitalName, hospitalLogo, plan }: SidebarProps) {
  const { isCollapsed, toggleSidebar } = useSidebar()

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex h-full flex-col border-r bg-card transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header with Logo and Toggle */}
        <div
          className={cn(
            'flex h-16 items-center border-b',
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}
        >
          {/* Logo */}
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-3 transition-all duration-300',
              isCollapsed && 'justify-center'
            )}
          >
            {hospitalLogo ? (
              <img
                src={hospitalLogo}
                alt={hospitalName || 'Logo'}
                className="h-8 w-8 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm">
                {hospitalName ? hospitalName.charAt(0) : 'D'}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight leading-tight truncate max-w-[140px] text-slate-900 dark:text-slate-100">
                  {hospitalName || 'DentalERP'}
                </span>
                {plan && (
                  <span
                    className={cn(
                      'text-[10px] font-medium leading-tight',
                      plan === 'FREE' ? 'text-muted-foreground' : 'text-primary'
                    )}
                  >
                    {plan === 'FREE'
                      ? 'Free plan'
                      : plan === 'PROFESSIONAL'
                        ? 'Professional plan'
                        : plan === 'ENTERPRISE'
                          ? 'Enterprise plan'
                          : 'DentalERP'}
                  </span>
                )}
              </div>
            )}
          </Link>

          {/* Toggle Button - only show when expanded */}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={toggleSidebar}
            >
              <PanelLeftClose className="h-4 w-4" />
              <span className="sr-only">Collapse sidebar</span>
            </Button>
          )}
        </div>

        {/* Toggle Button when collapsed - separate row */}
        {isCollapsed && (
          <div className="flex justify-center py-2 border-b">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleSidebar}>
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Expand sidebar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <NavigationMenu role={role} collapsed={isCollapsed} />
        </ScrollArea>

        {/* Footer */}
        <div className={cn('border-t py-3 text-center', isCollapsed ? 'px-2' : 'px-4')}>
          <p className="text-[10px] font-medium text-muted-foreground">
            {isCollapsed ? 'DE' : 'DentalERP · Practice workspace'}
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
}
