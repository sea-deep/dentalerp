import { Prisma } from '@prisma/client'
import { generatePatientUhid } from '@/lib/patient-uhid'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { localClock, minutes, validDate, timePattern } from '@/lib/clinic-time'

type DB = Prisma.TransactionClient
export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}
export async function lockClinic(tx: DB, hospitalId: string) {
  // All booking writers acquire the same clinic row before checking availability.
  await tx.$queryRaw`SELECT id FROM Hospital WHERE id = ${hospitalId} FOR UPDATE`
}
export async function getClinicSlots(
  db: DB,
  hospitalId: string,
  doctorId: string,
  date: string,
  duration = 30,
  excludeId?: string
) {
  if (!validDate(date) || !Number.isInteger(duration) || duration < 5 || duration > 480)
    throw new BookingError('Choose a valid date and duration')
  const hospital = await db.hospital.findUnique({ where: { id: hospitalId } })
  if (!hospital?.isActive) throw new BookingError('Clinic not found', 404)
  const clock = localClock(new Date(), hospital.timezone)
  if (date < clock.date) return []
  const day = new Date(date)
  const doctor = await db.staff.findFirst({
    where: { id: doctorId, hospitalId, isActive: true, user: { role: 'DOCTOR', isActive: true } },
  })
  if (!doctor) throw new BookingError('Doctor not found', 404)
  const rules = await db.setting.findMany({ where: { hospitalId, category: 'appointments' } })
  const config = Object.fromEntries(
    rules.map((rule) => [rule.key.replace('appointments.', ''), rule.value])
  )
  const [holiday, shift, leave, appointments] = await Promise.all([
    db.holiday.findFirst({ where: { hospitalId, date: day } }),
    db.staffShift.findUnique({
      where: { staffId_dayOfWeek: { staffId: doctorId, dayOfWeek: day.getUTCDay() } },
    }),
    db.leave.findFirst({
      where: {
        hospitalId,
        staffId: doctorId,
        status: 'APPROVED',
        startDate: { lte: day },
        endDate: { gte: day },
      },
    }),
    db.appointment.findMany({
      where: {
        hospitalId,
        doctorId,
        scheduledDate: day,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
      },
      select: { scheduledTime: true, duration: true },
    }),
  ])
  if (holiday || leave || shift?.isActive === false) return []
  let hours = { start: '09:00', end: '21:00', lunchStart: '13:00', lunchEnd: '14:00' }
  try {
    if (hospital.workingHours) hours = { ...hours, ...JSON.parse(hospital.workingHours) }
  } catch {
    throw new BookingError('Clinic working hours need correction', 503)
  }
  if (config.startTime) hours.start = config.startTime
  if (config.endTime) hours.end = config.endTime
  if (config.lunchBreakStart) hours.lunchStart = config.lunchBreakStart
  if (config.lunchBreakEnd) hours.lunchEnd = config.lunchBreakEnd
  const advanceDays = Number(config.maxAdvanceBookingDays || 90)
  if ((Date.parse(date) - Date.parse(clock.date)) / 86400000 > advanceDays) return []
  const step = Number(config.slotDuration || 30)
  if (!Number.isInteger(step) || step < 5 || step > 480)
    throw new BookingError('Correct the clinic slot duration', 503)
  const start = Math.max(minutes(hours.start), shift ? minutes(shift.startTime) : 0)
  const end = Math.min(minutes(hours.end), shift ? minutes(shift.endTime) : 1440)
  const lunchStart = hours.lunchStart ? minutes(hours.lunchStart) : end
  const lunchEnd = hours.lunchEnd ? minutes(hours.lunchEnd) : end
  if (![start, end, lunchStart, lunchEnd].every(Number.isFinite))
    throw new BookingError('Clinic working hours need correction', 503)
  const slots: { time: string; available: boolean }[] = []
  for (let t = start; t + duration <= end; t += step) {
    const time = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
    const available =
      !(t < lunchEnd && t + duration > lunchStart) &&
      !(date === clock.date && time <= clock.time) &&
      !appointments.some(
        (a) => t < minutes(a.scheduledTime) + a.duration && t + duration > minutes(a.scheduledTime)
      )
    slots.push({ time, available })
  }
  return slots
}
export async function assertSlot(
  db: DB,
  hospitalId: string,
  doctorId: string,
  date: string,
  time: string,
  duration = 30,
  excludeId?: string
) {
  if (!timePattern.test(time)) throw new BookingError('Choose a valid time')
  const slots = await getClinicSlots(db, hospitalId, doctorId, date, duration, excludeId)
  if (!slots.some((s) => s.time === time && s.available))
    throw new BookingError('This slot is no longer available. Choose another time.', 409)
}
export async function approveBooking(
  hospitalId: string,
  id: string,
  actorId: string,
  change?: { date: string; time: string; reason: string }
) {
  return prisma.$transaction(
    async (tx) => {
      await lockClinic(tx, hospitalId)
      const enquiry = await tx.clinicEnquiry.findFirst({
        where: { id, hospitalId, kind: 'BOOKING' },
      })
      if (!enquiry || !['REQUESTED', 'CONTACTED'].includes(enquiry.status) || !enquiry.verifiedAt)
        throw new BookingError('Verified pending request not found', 409)
      const date = change?.date || enquiry.requestedDate?.toISOString().slice(0, 10)
      const time = change?.time || enquiry.requestedTime
      if (!date || !time || !enquiry.doctorId)
        throw new BookingError('Booking details are incomplete')
      await assertSlot(tx, hospitalId, enquiry.doctorId, date, time)
      let patient = enquiry.patientId
        ? await tx.patient.findFirst({
            where: { id: enquiry.patientId, hospitalId, isActive: true },
          })
        : await tx.patient.findFirst({
            where: { hospitalId, phone: enquiry.phone, isActive: true },
          })
      if (!patient) {
        const clinic = await tx.hospital.findUniqueOrThrow({ where: { id: hospitalId } })
        const count = await tx.patient.count({ where: { hospitalId } })
        if (clinic.patientLimit !== -1 && count >= clinic.patientLimit)
          throw new BookingError('Clinic patient limit reached', 403)
        const [firstName, ...rest] = enquiry.name.trim().split(/\s+/)
        patient = await tx.patient.create({
          data: {
            hospitalId,
            patientId: await generatePatientUhid(tx, hospitalId),
            firstName,
            lastName: rest.join(' '),
            phone: enquiry.phone,
          },
        })
      }
      await tx.patientCommunicationPreference.upsert({
        where: { patientId: patient.id },
        create: { patientId: patient.id, whatsappEnabled: true },
        update: {},
      })
      await tx.patientCareProfile.upsert({
        where: { patientId: patient.id },
        create: { hospitalId, patientId: patient.id, assignedDoctorId: enquiry.doctorId },
        update: {},
      })
      const appointment = await tx.appointment.create({
        data: {
          hospitalId,
          patientId: patient.id,
          doctorId: enquiry.doctorId,
          scheduledDate: new Date(date),
          scheduledTime: time,
          appointmentNo: `APT-${randomUUID().slice(0, 12).toUpperCase()}`,
          chiefComplaint: enquiry.message,
          status: 'CONFIRMED',
        },
      })
      await tx.clinicEnquiry.update({
        where: { id },
        data: {
          status: 'APPROVED',
          patientId: patient.id,
          appointmentId: appointment.id,
          reason: change?.reason,
          requestedDate: new Date(date),
          requestedTime: time,
        },
      })
      await tx.auditLog.create({
        data: {
          hospitalId,
          userId: actorId,
          action: 'APPROVE',
          entityType: 'BookingRequest',
          entityId: id,
          newValues: JSON.stringify({ appointmentId: appointment.id, reason: change?.reason }),
        },
      })
      return appointment
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
}
