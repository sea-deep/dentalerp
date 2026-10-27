import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { GlobalSearch } from '@/components/layout/global-search'
vi.mock('@/config/nav', () => ({ getNavigationForRole: () => [] }))
afterEach(() => vi.useRealTimers())
const openSearch = () => {
  render(<GlobalSearch role="ADMIN" />)
  fireEvent.click(screen.getByRole('button', { name: /Search patients/ }))
  return screen.getByLabelText('Search records and pages')
}

describe('Record search reliability', () => {
  it('ignores a pending response after the query is cleared', async () => {
    vi.useFakeTimers()
    let resolveOld!: (response: Response) => void
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        })
    )
    const input = openSearch()
    fireEvent.change(input, { target: { value: 'old patient' } })
    await act(async () => vi.advanceTimersByTimeAsync(250))
    fireEvent.change(input, { target: { value: '' } })
    await act(async () =>
      resolveOld({
        ok: true,
        json: async () => ({
          patients: [{ id: 'old', label: 'Outdated result', sublabel: '', href: '/patients/old' }],
        }),
      } as Response)
    )
    expect(screen.queryByText('Outdated result')).not.toBeInTheDocument()
  })
  it('distinguishes failed lookup from no matching records', async () => {
    vi.useFakeTimers()
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Offline'))
    const input = openSearch()
    fireEvent.change(input, { target: { value: 'zzunknown' } })
    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(screen.getByRole('alert')).toHaveTextContent('Record search is unavailable')
    expect(screen.queryByText(/No results found/)).not.toBeInTheDocument()
  })
})
