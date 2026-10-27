import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { addDays, format } from 'date-fns'

import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'

function openPopover(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
  fireEvent.pointerUp(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
  fireEvent.click(trigger)
}

describe('DatePicker', () => {
  it('offers quick relative dates and emits the selected value', async () => {
    const onChange = vi.fn()
    render(<DatePicker onChange={onChange} />)

    openPopover(screen.getByRole('button', { name: /pick date/i }))

    await waitFor(() => expect(screen.getByText('Tomorrow')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Tomorrow'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: format(addDays(new Date(), 1), 'yyyy-MM-dd') }),
      })
    )
  })

  it('uses validity presets when requested', async () => {
    const onChange = vi.fn()
    render(<DatePicker presetMode="validity" onChange={onChange} />)

    openPopover(screen.getByRole('button', { name: /pick date/i }))

    await waitFor(() => expect(screen.getByText('1 week')).toBeInTheDocument())
    fireEvent.click(screen.getByText('1 week'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: format(addDays(new Date(), 7), 'yyyy-MM-dd') }),
      })
    )
  })

  it('hides scheduling presets for date-of-birth fields', async () => {
    render(<DatePicker presetMode="none" />)

    openPopover(screen.getByRole('button', { name: /pick date/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /next month/i })).toBeVisible())
    expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument()
  })

  it('selects a day from the calendar', async () => {
    const onChange = vi.fn()
    render(<DatePicker onChange={onChange} />)

    openPopover(screen.getByRole('button', { name: /pick date/i }))

    const target = addDays(new Date(), 10)
    fireEvent.click(
      await screen.findByRole('button', { name: format(target, 'EEEE, d MMMM yyyy') })
    )

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: format(target, 'yyyy-MM-dd') }),
      })
    )
  })
})

describe('TimePicker', () => {
  it('offers grouped quick slots and emits a 24-hour time', async () => {
    const onChange = vi.fn()
    render(<TimePicker onChange={onChange} />)

    openPopover(screen.getByRole('button', { name: /pick time/i }))

    await waitFor(() => expect(screen.getByText('Morning')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '9:00 AM' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ value: '09:00' }) })
    )
  })

  it('supports an exact time with the five-minute selector', async () => {
    const onChange = vi.fn()
    render(<TimePicker onChange={onChange} />)

    openPopover(screen.getByRole('button', { name: /pick time/i }))

    fireEvent.change(screen.getByLabelText('Hour'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Minute'), { target: { value: '35' } })
    fireEvent.click(screen.getByRole('button', { name: 'PM' }))

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ value: '14:35' }) })
    )
  })
})
