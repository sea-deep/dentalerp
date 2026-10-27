import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { DentalChart } from '@/components/dental-chart'
import { chartSummary, groupEntries } from '@/components/dental-chart/chart-model'
import { getMorphology } from '@/components/dental-chart/anatomic-tooth'
import type { DentalChartEntry } from '@/components/dental-chart/dental-chart-types'

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
const entry = (overrides: Partial<DentalChartEntry> = {}): DentalChartEntry => ({
  id: 'finding-1',
  toothNumber: 16,
  toothNotation: '16',
  condition: 'CARIES',
  severity: 'MILD',
  mesial: false,
  distal: false,
  occlusal: true,
  buccal: false,
  lingual: false,
  diagnosedDate: '2026-10-24T09:00:00Z',
  ...overrides,
})
const tooth = (number: number) =>
  screen.getByRole('button', { name: new RegExp(`^Tooth ${number} \\(`) })

beforeEach(() => {
  vi.mocked(fetch).mockReset()
})

describe('Clinical chart workflow', () => {
  it('treats supplied empty entries as a loaded, uncharted record', () => {
    render(<DentalChart patientId="patient-1" entries={[]} />)
    expect(fetch).not.toHaveBeenCalled()
    expect(tooth(16)).toHaveAccessibleName(/not charted/)
    expect(screen.queryByText('Present Teeth')).not.toBeInTheDocument()
  })
  it('keeps all active findings and counts each tooth once', () => {
    const grouped = groupEntries([
      entry(),
      entry({ id: 'second', condition: 'FILLED' }),
      entry({ id: 'old', resolvedDate: '2026-10-23', condition: 'MISSING' }),
      entry({ id: 'primary', toothNumber: 55 }),
    ])
    expect(chartSummary(grouped, 'ADULT')).toEqual({
      charted: 1,
      findings: 2,
      caries: 1,
      restored: 1,
    })
    expect(chartSummary(grouped, 'PEDIATRIC').charted).toBe(1)
    expect(getMorphology(54)).toBe('molar')
  })
  it('moves keyboard focus spatially and uses one chart tab stop', () => {
    render(<DentalChart patientId="patient-1" entries={[]} />)
    act(() => tooth(18).focus())
    fireEvent.keyDown(tooth(18), { key: 'ArrowRight' })
    expect(tooth(17)).toHaveFocus()
    fireEvent.keyDown(tooth(17), { key: 'ArrowDown' })
    expect(tooth(47)).toHaveFocus()
    expect(document.querySelectorAll('[data-tooth][tabindex="0"]')).toHaveLength(1)
  })
  it('shows retry instead of an empty chart after a load failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response)
    render(<DentalChart patientId="patient-1" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Chart unavailable')
    expect(screen.queryByLabelText('Dental odontogram')).not.toBeInTheDocument()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    } as Response)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByLabelText('Dental odontogram')).toBeInTheDocument()
  })
  it('edits an existing finding with PUT rather than adding a duplicate', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => entry({ notes: 'Updated note' }),
    } as Response)
    render(<DentalChart patientId="patient-1" entries={[entry()]} />)
    fireEvent.click(tooth(16))
    fireEvent.click(screen.getByRole('button', { name: 'Edit finding' }))
    fireEvent.change(screen.getByLabelText('Clinical notes'), { target: { value: 'Updated note' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/dental-chart/finding-1',
        expect.objectContaining({ method: 'PUT' })
      )
    )
    await waitFor(() => expect(screen.getByText('Updated note')).toBeInTheDocument())
    expect(screen.getByText(/Current record/).parentElement).toHaveTextContent('(1)')
  })
  it('preserves notes and surfaces after a failed save', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Connection lost' }),
    } as Response)
    render(<DentalChart patientId="patient-1" entries={[]} />)
    fireEvent.click(tooth(16))
    fireEvent.change(screen.getByLabelText('Condition'), { target: { value: 'CARIES' } })
    fireEvent.change(screen.getByLabelText('Clinical notes'), {
      target: { value: 'Keep this observation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Mesial', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Save finding' }))
    expect(await screen.findByText('Connection lost')).toBeInTheDocument()
    expect(screen.getByLabelText('Clinical notes')).toHaveValue('Keep this observation')
    expect(screen.getByRole('button', { name: 'Mesial', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
  it('keeps read-only records inspectable without write controls', () => {
    render(<DentalChart patientId="patient-1" entries={[entry()]} editable={false} />)
    fireEvent.click(tooth(16))
    expect(screen.getByText('Read only')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save finding' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark resolved' })).not.toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Tooth finding details')).getByText('Caries')
    ).toBeInTheDocument()
  })
  it('ignores an old patient response after switching patients', async () => {
    let resolveOld!: (response: Response) => void
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        })
    )
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    } as Response)
    const { rerender } = render(<DentalChart patientId="patient-old" />)
    rerender(<DentalChart patientId="patient-new" />)
    expect(await screen.findByLabelText('Dental odontogram')).toBeInTheDocument()
    await act(async () =>
      resolveOld({ ok: true, json: async () => ({ entries: [entry()] }) } as Response)
    )
    expect(tooth(16)).toHaveAccessibleName(/not charted/)
  })
})
