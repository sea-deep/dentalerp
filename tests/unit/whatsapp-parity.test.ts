import { describe, it, expect, vi, beforeEach } from 'vitest'
const mock = vi.hoisted(() => ({
  setting: { findUnique: vi.fn() },
  preference: { findUnique: vi.fn() },
  messages: { upsert: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  appointments: { findMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    setting: mock.setting,
    patientCommunicationPreference: mock.preference,
    whatsAppMessage: mock.messages,
    appointment: mock.appointments,
  },
}))
vi.mock('@/lib/encryption', () => ({ decrypt: () => 'test-token' }))
import {
  queueWhatsApp,
  dispatchWhatsApp,
  processAppointmentAutomation,
} from '@/lib/services/whatsapp.service'
const config = {
  enabled: true,
  phoneNumberId: '123',
  accessToken: 'encrypted',
  apiVersion: 'v23.0',
  language: 'en',
  templates: { CONFIRMED: 'appointment_confirmed' },
}
beforeEach(() => {
  vi.resetAllMocks()
  mock.setting.findUnique.mockResolvedValue({ value: JSON.stringify(config) })
  mock.preference.findUnique.mockResolvedValue({
    whatsappEnabled: true,
    appointmentReminders: true,
  })
  mock.messages.updateMany.mockResolvedValue({ count: 1 })
})
describe('WhatsApp outbox and scheduling', () => {
  it('uses clinic-scoped event keys to deduplicate events', async () => {
    await queueWhatsApp({
      hospitalId: 'h1',
      eventKey: 'CONFIRMED:a1',
      event: 'CONFIRMED',
      phone: '9876543210',
      patientId: 'p1',
      parameters: ['Test'],
    })
    expect(mock.messages.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { hospitalId_eventKey: { hospitalId: 'h1', eventKey: 'CONFIRMED:a1' } },
        update: {},
      })
    )
  })
  it('requires explicit patient WhatsApp consent', async () => {
    mock.preference.findUnique.mockResolvedValue(null)
    await queueWhatsApp({
      hospitalId: 'h1',
      eventKey: 'x',
      event: 'CONFIRMED',
      phone: '9876543210',
      patientId: 'p1',
      parameters: [],
    })
    expect(mock.messages.upsert).not.toHaveBeenCalled()
  })
  it('does not send a message another worker has claimed', async () => {
    mock.messages.findMany.mockResolvedValue([{ id: 'm1', hospitalId: 'h1' }])
    mock.messages.updateMany.mockResolvedValue({ count: 0 })
    await dispatchWhatsApp()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('marks only provider-accepted messages as sent and uses the official template payload', async () => {
    mock.messages.findMany.mockResolvedValue([
      {
        id: 'm1',
        hospitalId: 'h1',
        phone: '9876543210',
        event: 'CONFIRMED',
        parameters: ['Test'],
        patientId: 'p1',
      },
    ])
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.test' }] }),
    } as Response)
    expect(await dispatchWhatsApp()).toMatchObject({ sent: 1, failed: 0 })
    expect(fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v23.0/123/messages',
      expect.objectContaining({ body: expect.stringContaining('appointment_confirmed') })
    )
    expect(mock.messages.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SENT', providerId: 'wamid.test' }),
      })
    )
  })
  it('holds ambiguous failures for manual review instead of retrying', async () => {
    mock.messages.findMany.mockResolvedValue([
      { id: 'm1', hospitalId: 'h1', phone: '9876543210', event: 'CONFIRMED', parameters: [] },
    ])
    vi.mocked(fetch).mockRejectedValue(new Error('Timed out'))
    expect(await dispatchWhatsApp()).toMatchObject({ failed: 1, sent: 0 })
    expect(mock.messages.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'FAILED', error: 'Timed out' } })
    )
  })
  it('marks no-shows only after the clinic-local appointment plus duration and grace', async () => {
    mock.appointments.findMany.mockResolvedValue([
      {
        id: 'a1',
        duration: 30,
        scheduledDate: new Date('2026-10-25'),
        scheduledTime: '10:30',
        hospital: { timezone: 'Asia/Kolkata' },
      },
    ])
    mock.appointments.updateMany.mockResolvedValue({ count: 1 })
    expect(await processAppointmentAutomation(new Date('2026-10-25T07:00:00Z'))).toMatchObject({
      noShows: 1,
    })
    expect(mock.appointments.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          checkedInAt: null,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        }),
      })
    )
  })
})
