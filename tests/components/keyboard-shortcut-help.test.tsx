import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KeyboardShortcutHelp } from '@/components/layout/keyboard-shortcut-help'
const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.useRealTimers())
const key = (value: string) => fireEvent.keyDown(window, { key: value })

describe('Workspace shortcuts', () => {
  it('opens help by mouse and keyboard', () => {
    render(<KeyboardShortcutHelp role="ADMIN" />)
    key('?')
    expect(screen.getByRole('dialog')).toHaveTextContent('Keyboard shortcuts')
    expect(screen.getByRole('dialog')).toHaveTextContent('Go to front desk queue')
  })
  it('navigates on a complete sequence', () => {
    render(<KeyboardShortcutHelp role="ADMIN" />)
    key('g')
    key('q')
    expect(push).toHaveBeenCalledWith('/appointments/queue')
  })
  it('expires unfinished sequences', () => {
    vi.useFakeTimers()
    render(<KeyboardShortcutHelp role="ADMIN" />)
    key('n')
    vi.advanceTimersByTime(1100)
    key('p')
    expect(push).not.toHaveBeenCalled()
  })
  it('does not navigate when typing or when a menu is open', () => {
    render(
      <>
        <KeyboardShortcutHelp role="ADMIN" />
        <input aria-label="Note" />
      </>
    )
    fireEvent.keyDown(screen.getByLabelText('Note'), { key: 'n' })
    key('p')
    expect(push).not.toHaveBeenCalled()
    key('?')
    key('n')
    key('p')
    expect(push).not.toHaveBeenCalled()
  })
  it('limits actions to the current role', () => {
    render(<KeyboardShortcutHelp role="LAB_TECH" />)
    key('n')
    key('i')
    expect(push).not.toHaveBeenCalled()
    key('?')
    expect(screen.getByRole('dialog')).not.toHaveTextContent('New invoice')
  })
})
