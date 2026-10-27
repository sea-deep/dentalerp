import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { appointmentInstant } from '@/lib/clinic-time'

export const whatsappEvents = [
  'WELCOME',
  'CONFIRMED',
  'RESCHEDULED',
  'CANCELLED',
  'REMINDER_24H',
  'REMINDER_2H',
  'PRESCRIPTION',
  'INVOICE',
  'OTP',
] as const
export type WhatsAppEvent = (typeof whatsappEvents)[number]
export type WhatsAppSettings = {
  enabled: boolean
  phoneNumberId: string
  accessToken: string
  apiVersion: string
  language: string
  templates: Record<string, string>
}
export async function getWhatsAppSettings(hospitalId: string): Promise<WhatsAppSettings | null> {
  const setting = await prisma.setting.findUnique({
    where: { hospitalId_key: { hospitalId, key: 'whatsapp_settings' } },
  })
  if (!setting) return null
  const config = JSON.parse(setting.value)
  if (!config.enabled || !config.accessToken) return null
  return { ...config, accessToken: decrypt(config.accessToken) }
}
async function sendTemplate(
  config: WhatsAppSettings,
  phone: string,
  event: string,
  parameters: string[],
  document?: { id: string; filename: string }
) {
  const template = config.templates[event]
  if (!template) throw new Error(`Configure an approved ${event} template in WhatsApp settings`)
  const components: unknown[] = []
  if (document) components.push({ type: 'header', parameters: [{ type: 'document', document }] })
  if (parameters.length)
    components.push({
      type: 'body',
      parameters: parameters.map((text) => ({ type: 'text', text })),
    })
  if (event === 'OTP')
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: parameters[0] }],
    })
  const response = await fetch(
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace(/\D/g, '').replace(/^(?=\d{10}$)/, '91'),
        type: 'template',
        template: { name: template, language: { code: config.language }, components },
      }),
      signal: AbortSignal.timeout(15000),
    }
  )
  const result = await response.json()
  if (!response.ok || !result.messages?.[0]?.id)
    throw new Error(`WhatsApp rejected the message (${result.error?.code || response.status})`)
  return result.messages[0].id as string
}
export async function sendBookingOTP(hospitalId: string, phone: string, code: string) {
  const config = await getWhatsAppSettings(hospitalId)
  if (!config) throw new Error('WhatsApp verification is not configured')
  // Authentication codes are never persisted in message logs.
  return sendTemplate(config, phone, 'OTP', [code])
}
export async function queueWhatsApp(input: {
  hospitalId: string
  eventKey: string
  event: WhatsAppEvent
  patientId?: string
  phone: string
  parameters: string[]
  documentKind?: string
  documentId?: string
}) {
  try {
    const config = await getWhatsAppSettings(input.hospitalId)
    if (!config) return
    if (input.patientId) {
      const preference = await prisma.patientCommunicationPreference.findUnique({
        where: { patientId: input.patientId },
      })
      if (
        !preference?.whatsappEnabled ||
        (input.event.startsWith('REMINDER') && !preference.appointmentReminders)
      )
        return
    }
    await prisma.whatsAppMessage.upsert({
      where: { hospitalId_eventKey: { hospitalId: input.hospitalId, eventKey: input.eventKey } },
      update: {},
      create: input,
    })
  } catch (e) {
    console.error(
      'Could not queue WhatsApp event',
      input.event,
      e instanceof Error ? e.message : 'Unknown error'
    )
  }
}
export async function queueAppointmentMessage(
  id: string,
  event: 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED' | 'REMINDER_24H' | 'REMINDER_2H'
) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, doctor: true, hospital: true },
    })
    if (!appointment) return
    const date = appointment.scheduledDate.toISOString().slice(0, 10)
    await queueWhatsApp({
      hospitalId: appointment.hospitalId,
      patientId: appointment.patientId,
      phone: appointment.patient.phone,
      event,
      eventKey: `${event}:${id}:${date}:${appointment.scheduledTime}${['RESCHEDULED', 'CANCELLED'].includes(event) ? `:${appointment.updatedAt.toISOString()}` : ''}`,
      parameters: [
        `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim(),
        appointment.hospital.name,
        date,
        appointment.scheduledTime,
        `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        appointment.appointmentNo,
      ],
    })
  } catch (e) {
    console.error(
      'Could not prepare appointment notification',
      e instanceof Error ? e.message : 'Unknown error'
    )
  }
}
export async function queueDocumentMessage(
  hospitalId: string,
  kind: 'INVOICE' | 'PRESCRIPTION',
  id: string
) {
  try {
    const document =
      kind === 'INVOICE'
        ? await prisma.invoice.findFirst({ where: { id, hospitalId }, include: { patient: true } })
        : await prisma.prescription.findFirst({
            where: { id, hospitalId },
            include: { patient: true },
          })
    if (!document) return
    await queueWhatsApp({
      hospitalId,
      patientId: document.patientId,
      phone: document.patient.phone,
      event: kind,
      eventKey: `${kind}:${id}`,
      parameters: [`${document.patient.firstName} ${document.patient.lastName}`.trim()],
      documentKind: kind,
      documentId: id,
    })
  } catch (e) {
    console.error(
      'Could not prepare document notification',
      e instanceof Error ? e.message : 'Unknown error'
    )
  }
}
export async function dispatchWhatsApp(limit = 50) {
  const queued = await prisma.whatsAppMessage.findMany({
    where: { status: 'QUEUED' },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  let sent = 0,
    failed = 0
  for (const message of queued) {
    const config = await getWhatsAppSettings(message.hospitalId)
    if (!config) continue
    // Atomic claim: a second scheduler cannot dispatch this message concurrently.
    const claim = await prisma.whatsAppMessage.updateMany({
      where: { id: message.id, status: 'QUEUED' },
      data: { status: 'SENDING', attempts: { increment: 1 } },
    })
    if (!claim.count) continue
    try {
      if (message.patientId) {
        const preference = await prisma.patientCommunicationPreference.findUnique({
          where: { patientId: message.patientId },
        })
        if (
          !preference?.whatsappEnabled ||
          (message.event.startsWith('REMINDER') && !preference.appointmentReminders)
        ) {
          await prisma.whatsAppMessage.update({
            where: { id: message.id },
            data: { status: 'CANCELLED', error: 'Patient communication preference changed' },
          })
          continue
        }
      }
      let document: { id: string; filename: string } | undefined
      if (message.documentId && message.documentKind) {
        const { generateClinicPdf } = await import('./clinic-pdf.service')
        const pdf = await generateClinicPdf(
          message.hospitalId,
          message.documentKind as 'INVOICE' | 'PRESCRIPTION',
          message.documentId
        )
        const form = new FormData()
        form.set('messaging_product', 'whatsapp')
        form.set('type', 'application/pdf')
        form.set(
          'file',
          new Blob([new Uint8Array(pdf.bytes)], { type: 'application/pdf' }),
          pdf.filename
        )
        const upload = await fetch(
          `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/media`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${config.accessToken}` },
            body: form,
            signal: AbortSignal.timeout(15000),
          }
        )
        const media = await upload.json()
        if (!upload.ok || !media.id) throw new Error('WhatsApp document upload failed')
        document = { id: media.id, filename: pdf.filename }
      }
      const providerId = await sendTemplate(
        config,
        message.phone,
        message.event,
        message.parameters as string[],
        document
      )
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: { status: 'SENT', providerId, sentAt: new Date(), error: null },
      })
      sent++
    } catch (e) {
      // Ambiguous network failures are held for manual review, never blindly retried.
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: { status: 'FAILED', error: e instanceof Error ? e.message : 'Sending failed' },
      })
      failed++
    }
  }
  return { checked: queued.length, sent, failed }
}
export async function processAppointmentAutomation(now = new Date()) {
  const appointments = await prisma.appointment.findMany({
    where: { status: { in: ['SCHEDULED', 'CONFIRMED'] }, hospital: { isActive: true } },
    include: { hospital: true },
  })
  let noShows = 0
  for (const appointment of appointments) {
    const start = appointmentInstant(
      appointment.scheduledDate,
      appointment.scheduledTime,
      appointment.hospital.timezone
    )
    const hours = (start.getTime() - now.getTime()) / 3600000
    if (hours <= -(appointment.duration + 60) / 60) {
      const changed = await prisma.appointment.updateMany({
        where: {
          id: appointment.id,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          checkedInAt: null,
        },
        data: { status: 'NO_SHOW' },
      })
      noShows += changed.count
    } else if (hours > 0 && hours <= 2) await queueAppointmentMessage(appointment.id, 'REMINDER_2H')
    else if (hours > 2 && hours <= 24) await queueAppointmentMessage(appointment.id, 'REMINDER_24H')
  }
  return { checked: appointments.length, noShows }
}
