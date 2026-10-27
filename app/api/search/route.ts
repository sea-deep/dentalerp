import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'

interface SearchResult {
  id: string
  label: string
  sublabel: string
  href: string
  meta?: Record<string, string | null>
}

export async function GET(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole()
  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = new URL(req.url).searchParams.get('q')?.trim() || ''
  if (q.length < 2) {
    return NextResponse.json({
      patients: [],
      appointments: [],
      invoices: [],
      staff: [],
      treatments: [],
      medicines: [],
    })
  }

  try {
    const [patients, appointments, invoices, staff, treatments, medicines] = await Promise.all([
      // Patients
      prisma.patient.findMany({
        where: {
          hospitalId,
          isActive: true,
          OR: [
            { patientId: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
          ],
        },
        select: { id: true, patientId: true, firstName: true, lastName: true, phone: true },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      // Appointments
      prisma.appointment.findMany({
        where: {
          hospitalId,
          OR: [
            { appointmentNo: { contains: q } },
            { patient: { firstName: { contains: q } } },
            { patient: { lastName: { contains: q } } },
            { patient: { phone: { contains: q } } },
          ],
        },
        select: {
          id: true,
          appointmentNo: true,
          scheduledDate: true,
          scheduledTime: true,
          status: true,
          patient: { select: { firstName: true, lastName: true } },
          doctor: { select: { firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { scheduledDate: 'desc' },
      }),

      // Invoices
      prisma.invoice.findMany({
        where: {
          hospitalId,
          OR: [
            { invoiceNo: { contains: q } },
            { patient: { firstName: { contains: q } } },
            { patient: { lastName: { contains: q } } },
            { patient: { patientId: { contains: q } } },
          ],
        },
        select: {
          id: true,
          invoiceNo: true,
          totalAmount: true,
          status: true,
          patient: { select: { firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      // Staff
      prisma.staff.findMany({
        where: {
          hospitalId,
          isActive: true,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
            { employeeId: { contains: q } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialization: true,
          employeeId: true,
          user: { select: { role: true } },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      // Treatments
      prisma.treatment.findMany({
        where: {
          hospitalId,
          OR: [
            { treatmentNo: { contains: q } },
            { patient: { firstName: { contains: q } } },
            { patient: { lastName: { contains: q } } },
            { patient: { patientId: { contains: q } } },
          ],
        },
        select: {
          id: true,
          treatmentNo: true,
          status: true,
          patient: { select: { firstName: true, lastName: true } },
          procedure: { select: { name: true } },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      // Shared Indian medicine catalog — brand and generic names
      prisma.medicineCatalog.findMany({
        where: {
          isDiscontinued: false,
          OR: [
            { brandName: { contains: q } },
            { genericName: { contains: q } },
            { composition: { contains: q } },
          ],
        },
        select: {
          id: true,
          brandName: true,
          genericName: true,
          composition: true,
          strength: true,
          form: true,
          manufacturer: true,
        },
        take: 5,
        orderBy: { brandName: 'asc' },
      }),
    ])

    // Map to uniform search result shape
    const result = {
      patients: patients.map((p): SearchResult => ({
        id: p.id,
        label: `${p.firstName} ${p.lastName}`,
        sublabel: `${p.patientId} · ${p.phone}`,
        href: `/patients/${p.id}`,
      })),
      appointments: appointments.map((a): SearchResult => ({
        id: a.id,
        label: `${a.appointmentNo} — ${a.patient.firstName} ${a.patient.lastName}`,
        sublabel: `${new Date(a.scheduledDate).toLocaleDateString('en-IN')} ${a.scheduledTime} · Dr. ${a.doctor.firstName} ${a.doctor.lastName} · ${a.status}`,
        href: `/appointments/${a.id}`,
      })),
      invoices: invoices.map((inv): SearchResult => ({
        id: inv.id,
        label: `${inv.invoiceNo} — ${inv.patient.firstName} ${inv.patient.lastName}`,
        sublabel: `₹${Number(inv.totalAmount).toLocaleString('en-IN')} · ${inv.status}`,
        href: `/billing/invoices/${inv.id}`,
      })),
      staff: staff.map((s): SearchResult => ({
        id: s.id,
        label: `${s.firstName} ${s.lastName}`,
        sublabel: `${s.employeeId || ''} · ${s.specialization || s.user?.role || ''}`,
        href: `/staff/${s.id}`,
      })),
      treatments: treatments.map((t): SearchResult => ({
        id: t.id,
        label: `${t.treatmentNo} — ${t.patient.firstName} ${t.patient.lastName}`,
        sublabel: `${t.procedure?.name || '—'} · ${t.status}`,
        href: `/treatments/${t.id}`,
      })),
      medicines: medicines.map((m): SearchResult => ({
        id: m.id,
        label: `${m.brandName}`,
        sublabel: [m.composition || m.genericName, m.form, m.manufacturer]
          .filter(Boolean)
          .join(' · '),
        href: `/prescriptions/new?medicineId=${m.id}`,
        meta: { genericName: m.genericName, strength: m.strength },
      })),
    }

    if (!user.access?.clinical) {
      result.treatments = []
      result.medicines = []
    }
    if (!user.access?.billing) result.invoices = []
    if (!user.access?.staff) result.staff = []
    if (!user.access?.patients) result.patients = []
    if (!user.access?.appointments) result.appointments = []
    return NextResponse.json(result)
  } catch (err) {
    console.error('Global search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
