/**
 * Demo clinic seed — layers a realistic, presentation-ready dataset on top of
 * `prisma/seed.ts` (which creates the clinic, users, procedures, inventory
 * basics and a handful of appointments).
 *
 * Run with:  npx tsx prisma/seed-demo.ts
 *
 * Every record uses a deterministic natural key and is upserted, so the script
 * can be re-run safely. Existing hand-made/test data is left untouched.
 */
import {
  PrismaClient,
  Role,
  Gender,
  BloodGroup,
  ProcedureCategory,
  TreatmentStatus,
  AppointmentStatus,
  AppointmentType,
  Priority,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
  InsuranceClaimStatus,
  MembershipStatus,
  TreatmentPlanStatus,
  TreatmentPlanItemStatus,
  LabWorkType,
  LabOrderStatus,
  LabOrderPriority,
  ConsultationStatus,
  InventoryItemType,
  SupplierStatus,
  ToothCondition,
  Severity,
  DiscountType,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const SLUG = 'demo-dental-clinic'

// ---------------------------------------------------------------- utilities
let rngState = 20261023
function rand() {
  rngState = (rngState * 1664525 + 1013904223) >>> 0
  return rngState / 2 ** 32
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}
function chance(p: number) {
  return rand() < p
}
function int(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min
}

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

/** Local calendar day at UTC midnight — safe for MySQL DATE columns. */
function day(offset: number) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offset)
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}
function at(offset: number, hour: number, minute = 0) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offset)
  d.setHours(hour, minute, 0, 0)
  return d
}
function rupee(n: number) {
  return Math.round(n * 100) / 100
}
function isoDay(offset: number) {
  return day(offset).toISOString().slice(0, 10).replace(/-/g, '')
}

// ---------------------------------------------------------------- data pools
const PATIENT_NAMES: Array<[string, string, Gender]> = [
  ['Aarav', 'Menon', 'MALE'],
  ['Diya', 'Shah', 'FEMALE'],
  ['Vivaan', 'Reddy', 'MALE'],
  ['Ishita', 'Banerjee', 'FEMALE'],
  ['Kabir', 'Malhotra', 'MALE'],
  ['Ananya', 'Pillai', 'FEMALE'],
  ['Aditya', 'Rao', 'MALE'],
  ['Meera', 'Joshi', 'FEMALE'],
  ['Reyansh', 'Gupta', 'MALE'],
  ['Saanvi', 'Kulkarni', 'FEMALE'],
  ['Arjun', 'Nambiar', 'MALE'],
  ['Riya', 'Chatterjee', 'FEMALE'],
  ['Karthik', 'Subramani', 'MALE'],
  ['Nithya', 'Sundaram', 'FEMALE'],
  ['Rohit', 'Deshpande', 'MALE'],
  ['Pooja', 'Agarwal', 'FEMALE'],
  ['Siddharth', 'Naidu', 'MALE'],
  ['Tanvi', 'Bhat', 'FEMALE'],
  ['Manish', 'Tiwari', 'MALE'],
  ['Shreya', 'Ghosh', 'FEMALE'],
  ['Harish', 'Kumar', 'MALE'],
  ['Divya', 'Srinivasan', 'FEMALE'],
  ['Nikhil', 'Varma', 'MALE'],
  ['Keerthana', 'Raj', 'FEMALE'],
  ['Sameer', 'Qureshi', 'MALE'],
  ['Aparna', 'Krishnan', 'FEMALE'],
  ['Yash', 'Patel', 'MALE'],
  ['Mitali', 'Sen', 'FEMALE'],
  ['Dev', 'Anand', 'MALE'],
  ['Rutuja', 'More', 'FEMALE'],
  ['Farhan', 'Ali', 'MALE'],
  ['Sneha', 'Prabhu', 'FEMALE'],
  ['Varun', 'Shetty', 'MALE'],
  ['Lavanya', 'Iyer', 'FEMALE'],
]

const CITIES = ['Chennai', 'Bengaluru', 'Coimbatore', 'Madurai', 'Hyderabad', 'Pune']
const OCCUPATIONS = [
  'Software Engineer',
  'Teacher',
  'Business Owner',
  'Accountant',
  'Homemaker',
  'Student',
  'Doctor',
  'Sales Manager',
  'Architect',
  'Retired',
]
const BLOOD: BloodGroup[] = [
  BloodGroup.O_POSITIVE,
  BloodGroup.A_POSITIVE,
  BloodGroup.B_POSITIVE,
  BloodGroup.AB_POSITIVE,
  BloodGroup.O_NEGATIVE,
  BloodGroup.A_NEGATIVE,
]

// ---------------------------------------------------------------- main
async function main() {
  console.log('Preparing demo clinic dataset…')
  const hospital = await prisma.hospital.findUnique({ where: { slug: SLUG } })
  if (!hospital) throw new Error('Run `prisma/seed.ts` first — demo hospital not found')
  const hospitalId = hospital.id

  // -------------------------------------------------------------- patients
  const patients = []
  for (let i = 0; i < PATIENT_NAMES.length; i++) {
    const [firstName, lastName, gender] = PATIENT_NAMES[i]
    const patientId = `PAT2026${String(i + 1).padStart(3, '0')}`
    const created = day(-int(30, 540))
    const age = int(18, 68)
    const p = await prisma.patient.upsert({
      where: { hospitalId_patientId: { hospitalId, patientId } },
      update: {},
      create: {
        hospitalId,
        patientId,
        firstName,
        lastName,
        gender,
        age,
        dateOfBirth: new Date(Date.UTC(new Date().getFullYear() - age, int(0, 11), int(1, 27))),
        bloodGroup: pick(BLOOD),
        phone: `98${String(76500000 + i)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        address: `${int(1, 120)}, ${pick(['MG Road', 'Anna Nagar', 'T Nagar', 'Indiranagar', 'RS Puram'])}`,
        city: pick(CITIES),
        state: 'Tamil Nadu',
        pincode: `6000${String(int(10, 99))}`,
        occupation: pick(OCCUPATIONS),
        emergencyContactName: `${pick(['Ramesh', 'Suresh', 'Lakshmi', 'Anita'])} ${lastName}`,
        emergencyContactPhone: `97${String(76500000 + i)}`,
        emergencyContactRelation: pick(['Spouse', 'Parent', 'Sibling']),
        isActive: true,
        createdAt: created,
      },
    })
    patients.push(p)

    await prisma.medicalHistory.upsert({
      where: { patientId: p.id },
      update: {},
      create: {
        patientId: p.id,
        hasAllergies: i % 4 === 0,
        drugAllergies: i % 4 === 0 ? pick(['Penicillin', 'Sulfa drugs', 'None known']) : null,
        hasDiabetes: i % 7 === 0,
        diabetesType: i % 7 === 0 ? 'Type 2' : null,
        hasHypertension: i % 5 === 0,
        hasHeartDisease: i % 11 === 0,
        hasAsthma: i % 9 === 0,
        smokingStatus: i % 6 === 0 ? 'FORMER' : 'NEVER',
        alcoholConsumption: i % 8 === 0 ? 'OCCASIONAL' : 'NEVER',
        previousDentalWork: pick([
          'Two amalgam fillings (2019)',
          'Root canal on upper right first molar',
          'Orthodontic treatment as a teenager',
          'No significant previous work',
        ]),
        lastDentalVisit: day(-int(60, 400)),
        dentalAnxietyLevel: int(0, 4),
      },
    })
  }
  console.log(`  ${patients.length} patients ready`)

  // -------------------------------------------------------------- staff
  const staffSeed = [
    {
      employeeId: 'EMP004',
      firstName: 'Dr. Arjun',
      lastName: 'Mehta',
      role: Role.DOCTOR,
      specialization: 'Endodontics',
      qualification: 'MDS (Conservative Dentistry & Endodontics)',
      email: 'arjun.mehta@demo-dental.com',
      phone: '9876500011',
    },
    {
      employeeId: 'EMP005',
      firstName: 'Dr. Kavya',
      lastName: 'Nair',
      role: Role.DOCTOR,
      specialization: 'Periodontics',
      qualification: 'MDS (Periodontology)',
      email: 'kavya.nair@demo-dental.com',
      phone: '9876500012',
    },
    {
      employeeId: 'EMP006',
      firstName: 'Dr. Rohan',
      lastName: 'Verma',
      role: Role.DOCTOR,
      specialization: 'Prosthodontics',
      qualification: 'MDS (Prosthodontics)',
      email: 'rohan.verma@demo-dental.com',
      phone: '9876500013',
    },
    {
      employeeId: 'EMP007',
      firstName: 'Dr. Meera',
      lastName: 'Pillai',
      role: Role.DOCTOR,
      specialization: 'Pedodontics',
      qualification: 'MDS (Pediatric Dentistry)',
      email: 'meera.pillai@demo-dental.com',
      phone: '9876500014',
    },
    {
      employeeId: 'EMP008',
      firstName: 'Nisha',
      lastName: 'Raghavan',
      role: Role.RECEPTIONIST,
      specialization: null,
      qualification: 'BBA',
      email: 'nisha.raghavan@demo-dental.com',
      phone: '9876500015',
    },
    {
      employeeId: 'EMP009',
      firstName: 'Karthik',
      lastName: 'Subramanian',
      role: Role.LAB_TECH,
      specialization: 'Dental Laboratory',
      qualification: 'Diploma in Dental Mechanics',
      email: 'karthik.subramanian@demo-dental.com',
      phone: '9876500016',
    },
    {
      employeeId: 'EMP010',
      firstName: 'Deepa',
      lastName: 'Balaji',
      role: Role.ACCOUNTANT,
      specialization: null,
      qualification: 'M.Com, CA Inter',
      email: 'deepa.balaji@demo-dental.com',
      phone: '9876500017',
    },
  ]

  const demoPassword = await bcrypt.hash('Demo@123', 10)
  for (const s of staffSeed) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        name: `${s.firstName} ${s.lastName}`,
        password: demoPassword,
        role: s.role,
        phone: s.phone,
        hospitalId,
        isHospitalAdmin: false,
      },
    })
    await prisma.staff.upsert({
      where: { hospitalId_employeeId: { hospitalId, employeeId: s.employeeId } },
      update: {},
      create: {
        hospitalId,
        userId: user.id,
        employeeId: s.employeeId,
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        email: s.email,
        specialization: s.specialization,
        qualification: s.qualification,
        joiningDate: day(-int(90, 900)),
        city: 'Chennai',
        state: 'Tamil Nadu',
        isActive: true,
      },
    })
  }

  const doctors = await prisma.staff.findMany({
    where: { hospitalId, user: { role: Role.DOCTOR } },
    include: { user: true },
  })
  const doctorIds = doctors.map((d) => d.id)
  console.log(`  ${doctors.length} doctors on the roster`)

  // -------------------------------------------------------------- procedures
  const procedures = await prisma.procedure.findMany({ where: { hospitalId, isActive: true } })
  const byCategory = (cat: ProcedureCategory) => procedures.filter((p) => p.category === cat)
  const clinicalProcedures = procedures.filter((p) => p.category !== ProcedureCategory.DIAGNOSTIC)
  if (clinicalProcedures.length === 0) throw new Error('No procedures seeded')

  const medications = await prisma.medication.findMany({ where: { hospitalId } })

  // -------------------------------------------------------------- appointments + treatments
  const appointmentTypes = [
    AppointmentType.CONSULTATION,
    AppointmentType.CHECK_UP,
    AppointmentType.PROCEDURE,
    AppointmentType.FOLLOW_UP,
  ]
  const timeSlots = [
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
    '18:00',
    '18:30',
    '19:00',
  ]

  let apptSeq = 0
  let treatmentSeq = 0
  let invoiceSeq = 0
  let paymentSeq = 0
  let prescriptionSeq = 0
  let treatedCount = 0
  let invoicedCount = 0

  for (let offset = -90; offset <= 14; offset++) {
    const weekday = day(offset).getUTCDay()
    const count = offset === 0 ? 11 : weekday === 0 ? 1 : int(2, 5)
    for (let j = 0; j < count; j++) {
      apptSeq++
      const appointmentNo = `APT-D${isoDay(offset)}-${String(j + 1).padStart(2, '0')}`
      const patient = patients[Math.floor(rand() * patients.length)]
      const doctorId = pick(doctorIds)
      const scheduledTime = timeSlots[(j * 3 + int(0, 2)) % timeSlots.length]

      let status: AppointmentStatus
      if (offset < 0) {
        const r = rand()
        status =
          r < 0.82
            ? AppointmentStatus.COMPLETED
            : r < 0.9
              ? AppointmentStatus.CANCELLED
              : r < 0.96
                ? AppointmentStatus.NO_SHOW
                : AppointmentStatus.COMPLETED
      } else if (offset === 0) {
        const cycle = [
          AppointmentStatus.COMPLETED,
          AppointmentStatus.CHECKED_IN,
          AppointmentStatus.IN_PROGRESS,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.SCHEDULED,
          AppointmentStatus.COMPLETED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CHECKED_IN,
          AppointmentStatus.COMPLETED,
          AppointmentStatus.SCHEDULED,
          AppointmentStatus.CONFIRMED,
        ]
        status = cycle[j % cycle.length]
      } else {
        status = chance(0.6) ? AppointmentStatus.SCHEDULED : AppointmentStatus.CONFIRMED
      }

      const isProcedure = chance(0.45)
      const appointment = await prisma.appointment.upsert({
        where: { hospitalId_appointmentNo: { hospitalId, appointmentNo } },
        update: {},
        create: {
          hospitalId,
          appointmentNo,
          patientId: patient.id,
          doctorId,
          scheduledDate: day(offset),
          scheduledTime,
          duration: isProcedure ? pick([45, 60, 90]) : 30,
          chairNumber: int(1, 4),
          appointmentType: isProcedure ? AppointmentType.PROCEDURE : pick(appointmentTypes),
          status,
          priority: chance(0.06) ? Priority.HIGH : Priority.NORMAL,
          checkedInAt:
            status === AppointmentStatus.COMPLETED ||
            status === AppointmentStatus.CHECKED_IN ||
            status === AppointmentStatus.IN_PROGRESS
              ? at(offset, Number(scheduledTime.slice(0, 2)), Number(scheduledTime.slice(3)))
              : null,
          chiefComplaint: pick([
            'Pain in lower right molar',
            'Bleeding gums while brushing',
            'Sensitivity to cold drinks',
            'Routine check-up and cleaning',
            'Broken front tooth after fall',
            'Bad breath and tartar build-up',
            'Wisdom tooth discomfort',
            'Follow-up after root canal',
          ]),
          notes: chance(0.3)
            ? 'Patient prefers evening slots. Confirm by phone a day before.'
            : null,
          createdAt: at(offset, 8, 0),
        },
      })

      // Treatment for completed clinical visits
      if (
        status === AppointmentStatus.COMPLETED &&
        offset <= 0 &&
        chance(0.72) &&
        clinicalProcedures.length > 0
      ) {
        treatmentSeq++
        const procedure = pick(clinicalProcedures)
        const treatmentNo = `TRT-D${String(treatmentSeq).padStart(4, '0')}`
        const tooth = pick(['11', '16', '21', '26', '36', '46', '14', '24', '37', '47'])
        const treatment = await prisma.treatment.upsert({
          where: { hospitalId_treatmentNo: { hospitalId, treatmentNo } },
          update: {},
          create: {
            hospitalId,
            treatmentNo,
            patientId: patient.id,
            appointmentId: appointment.id,
            procedureId: procedure.id,
            doctorId,
            toothNumbers: chance(0.7) ? tooth : null,
            chiefComplaint: appointment.chiefComplaint,
            diagnosis: pick([
              'Dental caries involving dentine',
              'Chronic gingivitis with calculus deposits',
              'Irreversible pulpitis',
              'Mild to moderate periodontitis',
              'Fractured crown without pulpal exposure',
              'Asymptomatic impacted third molar',
            ]),
            procedureNotes: 'Procedure completed under local anaesthesia. Patient tolerated well.',
            status: TreatmentStatus.COMPLETED,
            startTime: at(offset, Number(scheduledTime.slice(0, 2)), 0),
            endTime: at(offset, Number(scheduledTime.slice(0, 2)) + 1, 0),
            followUpRequired: chance(0.2),
            followUpDate: chance(0.2) ? day(offset + 14) : null,
            cost: rupee(Number(procedure.basePrice)),
            createdAt: at(offset, 10, 0),
          },
        })
        treatedCount++

        // Prescription for a subset of treatments
        if (chance(0.55) && medications.length > 0) {
          prescriptionSeq++
          const prescriptionNo = `PRX-D${String(prescriptionSeq).padStart(4, '0')}`
          const meds = [pick(medications)]
          if (chance(0.5)) meds.push(pick(medications))
          await prisma.prescription.upsert({
            where: { hospitalId_prescriptionNo: { hospitalId, prescriptionNo } },
            update: {},
            create: {
              hospitalId,
              prescriptionNo,
              patientId: patient.id,
              doctorId,
              diagnosis: treatment.diagnosis,
              notes: 'Take medicines after food. Complete the full course.',
              validUntil: day(offset + 30),
              createdAt: at(offset, 11, 30),
              medications: {
                create: meds.map((m) => ({
                  medicationId: m.id,
                  medicationName: m.name,
                  dosage: m.defaultDosage || '500 mg',
                  frequency: m.defaultFrequency || 'Twice daily',
                  duration: m.defaultDuration || '5 days',
                  route: 'Oral',
                  timing: 'After food',
                  quantity: 10,
                  instructions: 'Do not skip doses. Report any rash or stomach upset.',
                })),
              },
            },
          })
        }

        // Invoice for most treatments
        if (chance(0.85)) {
          invoiceSeq++
          const invoiceNo = `INV-D${String(invoiceSeq).padStart(4, '0')}`
          const subtotal = rupee(Number(procedure.basePrice))
          const discount = chance(0.15) ? rupee(subtotal * 0.1) : 0
          const taxable = rupee(subtotal - discount)
          const gst = rupee(taxable * 0.18)
          const total = rupee(taxable + gst)
          const roll = rand()
          let paid = 0
          let invStatus: InvoiceStatus = InvoiceStatus.PENDING
          if (roll < 0.68) {
            paid = total
            invStatus = InvoiceStatus.PAID
          } else if (roll < 0.86) {
            paid = rupee(total / 2)
            invStatus = InvoiceStatus.PARTIALLY_PAID
          } else if (offset < -15) {
            invStatus = InvoiceStatus.OVERDUE
          }

          const invoice = await prisma.invoice.upsert({
            where: { hospitalId_invoiceNo: { hospitalId, invoiceNo } },
            update: {},
            create: {
              hospitalId,
              invoiceNo,
              patientId: patient.id,
              subtotal,
              discountType: discount > 0 ? DiscountType.FIXED : null,
              discountValue: discount > 0 ? discount : null,
              discountAmount: discount,
              taxableAmount: taxable,
              cgstRate: 9,
              sgstRate: 9,
              cgstAmount: rupee(gst / 2),
              sgstAmount: rupee(gst / 2),
              totalAmount: total,
              paidAmount: paid,
              balanceAmount: rupee(total - paid),
              status: invStatus,
              dueDate: day(offset + 15),
              notes: `Treatment: ${procedure.name}`,
              createdAt: at(offset, 12, 0),
              items: {
                create: {
                  treatmentId: treatment.id,
                  description: procedure.name,
                  quantity: 1,
                  unitPrice: subtotal,
                  amount: subtotal,
                  taxable: true,
                },
              },
            },
          })
          invoicedCount++

          if (paid > 0) {
            paymentSeq++
            const paymentNo = `PAY-D${String(paymentSeq).padStart(4, '0')}`
            await prisma.payment.upsert({
              where: { hospitalId_paymentNo: { hospitalId, paymentNo } },
              update: { createdAt: at(offset, 12, 30) },
              create: {
                hospitalId,
                paymentNo,
                invoiceId: invoice.id,
                amount: paid,
                paymentMethod: pick([
                  PaymentMethod.UPI,
                  PaymentMethod.CARD,
                  PaymentMethod.CASH,
                  PaymentMethod.BANK_TRANSFER,
                ]),
                paymentDate: at(offset, 12, 30),
                transactionId: `TXN${isoDay(offset)}${String(paymentSeq).padStart(3, '0')}`,
                status: PaymentStatus.COMPLETED,
                notes: paid < total ? 'Part payment received at reception' : null,
              },
            })
          }
        }
      }

      // Upcoming video consultations
      if (offset >= 0 && offset <= 5 && chance(0.22)) {
        const slot = at(offset, Number(scheduledTime.slice(0, 2)), Number(scheduledTime.slice(3)))
        await prisma.videoConsultation.upsert({
          where: { appointmentId: appointment.id },
          update: {},
          create: {
            hospitalId,
            appointmentId: appointment.id,
            patientId: patient.id,
            doctorId,
            roomUrl: `https://meet.demo-dental.com/${appointment.id}`,
            roomName: `consult-${appointmentNo}`,
            status:
              offset === 0 && chance(0.4)
                ? ConsultationStatus.COMPLETED
                : ConsultationStatus.SCHEDULED,
            scheduledAt: slot,
            duration: offset === 0 && chance(0.4) ? 30 : null,
            notes: 'Tele-consultation for follow-up review.',
          },
        })
      }
    }
  }
  console.log(`  ${apptSeq} appointments, ${treatedCount} treatments, ${invoicedCount} invoices`)

  // -------------------------------------------------------------- treatment plans
  for (let i = 0; i < 8; i++) {
    const patient = patients[(i * 3) % patients.length]
    const planNumber = `TP-D${String(i + 1).padStart(3, '0')}`
    const items = Array.from({ length: int(2, 4) }, () => pick(clinicalProcedures))
    const estimatedCost = rupee(items.reduce((sum, p) => sum + Number(p.basePrice), 0))
    await prisma.treatmentPlan.upsert({
      where: { hospitalId_planNumber: { hospitalId, planNumber } },
      update: {},
      create: {
        hospitalId,
        planNumber,
        patientId: patient.id,
        title: pick([
          'Full mouth rehabilitation',
          'Smile makeover plan',
          'Orthodontic alignment plan',
          'Periodontal treatment plan',
        ]),
        description: 'Staged treatment plan explained to patient, consent pending for phase 2.',
        status:
          i < 3
            ? TreatmentPlanStatus.ACCEPTED
            : i < 5
              ? TreatmentPlanStatus.PROPOSED
              : TreatmentPlanStatus.IN_PROGRESS,
        estimatedCost,
        estimatedDuration: int(30, 120),
        startDate: day(-int(5, 40)),
        expectedEndDate: day(int(20, 90)),
        consentGiven: i < 3,
        consentDate: i < 3 ? day(-int(3, 20)) : null,
        createdAt: day(-int(10, 60)),
        items: {
          create: items.map((p, idx) => ({
            procedureId: p.id,
            toothNumbers: chance(0.6) ? pick(['16', '26', '36', '46']) : null,
            priority: idx + 1,
            estimatedCost: rupee(Number(p.basePrice)),
            status:
              idx === 0 && i < 5
                ? TreatmentPlanItemStatus.COMPLETED
                : TreatmentPlanItemStatus.PENDING,
          })),
        },
      },
    })
  }

  // -------------------------------------------------------------- insurance claims
  const insurers = [
    'Star Health Insurance',
    'HDFC Ergo',
    'ICICI Lombard',
    'New India Assurance',
    'Bajaj Allianz',
  ]
  for (let i = 0; i < 12; i++) {
    const patient = patients[(i * 2) % patients.length]
    const claimNumber = `CLM-D${String(i + 1).padStart(3, '0')}`
    const amount = rupee(int(4000, 45000))
    const statusCycle = [
      InsuranceClaimStatus.SUBMITTED,
      InsuranceClaimStatus.UNDER_REVIEW,
      InsuranceClaimStatus.APPROVED,
      InsuranceClaimStatus.PARTIALLY_APPROVED,
      InsuranceClaimStatus.SETTLED,
      InsuranceClaimStatus.REJECTED,
    ]
    const status = statusCycle[i % statusCycle.length]
    const approved =
      status === InsuranceClaimStatus.APPROVED || status === InsuranceClaimStatus.SETTLED
        ? amount
        : status === InsuranceClaimStatus.PARTIALLY_APPROVED
          ? rupee(amount * 0.6)
          : null
    await prisma.insuranceClaim.upsert({
      where: { hospitalId_claimNumber: { hospitalId, claimNumber } },
      update: {},
      create: {
        hospitalId,
        claimNumber,
        patientId: patient.id,
        insuranceProvider: insurers[i % insurers.length],
        policyNumber: `POL${int(100000, 999999)}`,
        claimAmount: amount,
        approvedAmount: approved,
        settledAmount: status === InsuranceClaimStatus.SETTLED ? approved : null,
        status,
        submittedDate: day(-int(10, 120)),
        approvedDate: approved != null ? day(-int(2, 9)) : null,
        settledDate: status === InsuranceClaimStatus.SETTLED ? day(-int(1, 5)) : null,
        rejectionReason:
          status === InsuranceClaimStatus.REJECTED
            ? 'Procedure not covered under the active policy'
            : null,
        notes: 'Documents verified at front desk.',
        createdAt: day(-int(10, 120)),
      },
    })
  }

  // -------------------------------------------------------------- memberships
  const planSeed = [
    {
      name: 'Smile Care Silver',
      price: 2999,
      duration: 12,
      description: 'Two cleanings and one consultation per year at a discounted rate.',
      benefits: [
        { category: 'PREVENTIVE', discountPercent: 20, description: '20% off preventive care' },
        { category: 'DIAGNOSTIC', discountPercent: 10, description: '10% off diagnostics' },
      ],
    },
    {
      name: 'Smile Care Gold',
      price: 5999,
      duration: 12,
      description: 'Priority appointments, free cleanings and 25% off most treatments.',
      benefits: [
        { category: 'PREVENTIVE', discountPercent: 100, description: 'Free cleanings' },
        { category: 'RESTORATIVE', discountPercent: 25, description: '25% off fillings' },
        { category: 'ENDODONTIC', discountPercent: 15, description: '15% off root canals' },
      ],
    },
    {
      name: 'Family Smile Plan',
      price: 9999,
      duration: 12,
      description: 'Covers up to four family members with preventive care included.',
      benefits: [
        { category: 'PREVENTIVE', discountPercent: 100, description: 'Preventive care included' },
        { category: 'ORTHODONTIC', discountPercent: 20, description: '20% off braces' },
      ],
      maxMembers: 4,
    },
  ]
  const plans = []
  for (const plan of planSeed) {
    let existing = await prisma.membershipPlan.findFirst({
      where: { hospitalId, name: plan.name },
    })
    if (!existing) {
      existing = await prisma.membershipPlan.create({
        data: {
          hospitalId,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          duration: plan.duration,
          benefits: plan.benefits,
          maxMembers: plan.maxMembers ?? null,
          isActive: true,
        },
      })
    }
    plans.push(existing)
  }
  for (let i = 0; i < 14; i++) {
    const patient = patients[(i * 5) % patients.length]
    const plan = plans[i % plans.length]
    const exists = await prisma.patientMembership.findFirst({
      where: { patientId: patient.id, planId: plan.id },
    })
    if (!exists) {
      await prisma.patientMembership.create({
        data: {
          hospitalId,
          patientId: patient.id,
          planId: plan.id,
          startDate: day(-int(10, 240)),
          endDate: day(int(30, 320)),
          status: i === 13 ? MembershipStatus.EXPIRED : MembershipStatus.ACTIVE,
          autoRenew: i % 3 === 0,
        },
      })
    }
  }

  // -------------------------------------------------------------- inventory depth
  const categories = await prisma.inventoryCategory.findMany({ where: { hospitalId } })
  const catId = (name: string) => categories.find((c) => c.name === name)?.id
  let supplierA = await prisma.supplier.findFirst({ where: { hospitalId, code: 'SUP-D-01' } })
  if (!supplierA) {
    supplierA = await prisma.supplier.create({
      data: {
        hospitalId,
        code: 'SUP-D-01',
        name: 'Chennai Dental Supplies',
        contactPerson: 'S. Ramesh',
        phone: '9840112233',
        email: 'sales@chennaidentalsupplies.in',
        city: 'Chennai',
        state: 'Tamil Nadu',
        gstNumber: '33AABCC1234D1Z5',
        paymentTerms: 'Net 30',
        rating: 5,
        status: SupplierStatus.ACTIVE,
      },
    })
  }

  const inventorySeed: Array<{
    sku: string
    name: string
    type: InventoryItemType
    unit: string
    purchase: number
    selling: number
    stock: number
    min: number
    category: string
  }> = [
    {
      sku: 'MAT-D-001',
      name: 'Composite Resin A2 Shade',
      type: InventoryItemType.DENTAL_MATERIAL,
      unit: 'syringe',
      purchase: 1250,
      selling: 1600,
      stock: 24,
      min: 8,
      category: 'Dental Materials',
    },
    {
      sku: 'MAT-D-002',
      name: 'Glass Ionomer Cement',
      type: InventoryItemType.DENTAL_MATERIAL,
      unit: 'kit',
      purchase: 890,
      selling: 1150,
      stock: 12,
      min: 5,
      category: 'Dental Materials',
    },
    {
      sku: 'MAT-D-003',
      name: 'Root Canal Sealer',
      type: InventoryItemType.DENTAL_MATERIAL,
      unit: 'tube',
      purchase: 650,
      selling: 900,
      stock: 3,
      min: 6,
      category: 'Dental Materials',
    },
    {
      sku: 'MAT-D-004',
      name: 'Impression Putty',
      type: InventoryItemType.DENTAL_MATERIAL,
      unit: 'box',
      purchase: 1450,
      selling: 1800,
      stock: 9,
      min: 4,
      category: 'Dental Materials',
    },
    {
      sku: 'MAT-D-005',
      name: 'Dental Alginate Powder',
      type: InventoryItemType.DENTAL_MATERIAL,
      unit: 'pack',
      purchase: 420,
      selling: 600,
      stock: 18,
      min: 6,
      category: 'Dental Materials',
    },
    {
      sku: 'CON-D-001',
      name: 'Nitrile Examination Gloves (M)',
      type: InventoryItemType.CONSUMABLE,
      unit: 'box',
      purchase: 380,
      selling: 500,
      stock: 42,
      min: 15,
      category: 'Consumables',
    },
    {
      sku: 'CON-D-002',
      name: '3-Ply Surgical Masks',
      type: InventoryItemType.CONSUMABLE,
      unit: 'box',
      purchase: 220,
      selling: 300,
      stock: 8,
      min: 12,
      category: 'Consumables',
    },
    {
      sku: 'CON-D-003',
      name: 'Saliva Ejectors',
      type: InventoryItemType.CONSUMABLE,
      unit: 'pack',
      purchase: 180,
      selling: 250,
      stock: 0,
      min: 10,
      category: 'Consumables',
    },
    {
      sku: 'CON-D-004',
      name: 'Cotton Rolls',
      type: InventoryItemType.CONSUMABLE,
      unit: 'pack',
      purchase: 95,
      selling: 150,
      stock: 55,
      min: 20,
      category: 'Consumables',
    },
    {
      sku: 'CON-D-005',
      name: 'Disposable Syringes 5ml',
      type: InventoryItemType.CONSUMABLE,
      unit: 'box',
      purchase: 310,
      selling: 420,
      stock: 14,
      min: 10,
      category: 'Consumables',
    },
    {
      sku: 'INS-D-001',
      name: 'Periodontal Probe',
      type: InventoryItemType.INSTRUMENT,
      unit: 'piece',
      purchase: 750,
      selling: 1000,
      stock: 6,
      min: 3,
      category: 'Instruments',
    },
    {
      sku: 'INS-D-002',
      name: 'Dental Mirror Set',
      type: InventoryItemType.INSTRUMENT,
      unit: 'set',
      purchase: 480,
      selling: 650,
      stock: 11,
      min: 4,
      category: 'Instruments',
    },
    {
      sku: 'INS-D-003',
      name: 'Extraction Forceps (Upper)',
      type: InventoryItemType.INSTRUMENT,
      unit: 'piece',
      purchase: 1650,
      selling: 2100,
      stock: 2,
      min: 3,
      category: 'Instruments',
    },
    {
      sku: 'INS-D-004',
      name: 'Ultrasonic Scaler Tip',
      type: InventoryItemType.INSTRUMENT,
      unit: 'piece',
      purchase: 980,
      selling: 1300,
      stock: 7,
      min: 3,
      category: 'Instruments',
    },
    {
      sku: 'MED-D-001',
      name: 'Lignocaine 2% with Adrenaline',
      type: InventoryItemType.MEDICINE,
      unit: 'cartridge',
      purchase: 22,
      selling: 35,
      stock: 80,
      min: 30,
      category: 'Medicines',
    },
    {
      sku: 'MED-D-002',
      name: 'Sodium Hypochlorite 3%',
      type: InventoryItemType.MEDICINE,
      unit: 'bottle',
      purchase: 140,
      selling: 200,
      stock: 10,
      min: 5,
      category: 'Medicines',
    },
    {
      sku: 'OFF-D-001',
      name: 'Appointment Cards',
      type: InventoryItemType.OFFICE_SUPPLY,
      unit: 'pack',
      purchase: 250,
      selling: 0,
      stock: 20,
      min: 5,
      category: 'Office Supplies',
    },
    {
      sku: 'OFF-D-002',
      name: 'Thermal Printer Rolls',
      type: InventoryItemType.OFFICE_SUPPLY,
      unit: 'pack',
      purchase: 320,
      selling: 0,
      stock: 4,
      min: 6,
      category: 'Office Supplies',
    },
    {
      sku: 'EQP-D-001',
      name: 'LED Curing Light',
      type: InventoryItemType.EQUIPMENT,
      unit: 'piece',
      purchase: 8500,
      selling: 11000,
      stock: 2,
      min: 1,
      category: 'Equipment',
    },
    {
      sku: 'EQP-D-002',
      name: 'Apex Locator',
      type: InventoryItemType.EQUIPMENT,
      unit: 'piece',
      purchase: 14500,
      selling: 18000,
      stock: 1,
      min: 1,
      category: 'Equipment',
    },
  ]
  for (const item of inventorySeed) {
    await prisma.inventoryItem.upsert({
      where: { hospitalId_sku: { hospitalId, sku: item.sku } },
      update: {},
      create: {
        hospitalId,
        sku: item.sku,
        name: item.name,
        categoryId: catId(item.category),
        itemType: item.type,
        preferredSupplierId: supplierA.id,
        unit: item.unit,
        currentStock: item.stock,
        minimumStock: item.min,
        reorderLevel: item.min + 5,
        purchasePrice: item.purchase,
        sellingPrice: item.selling,
        taxPercentage: 12,
        isActive: true,
      },
    })
  }

  // -------------------------------------------------------------- lab orders
  const vendors = await prisma.labVendor.findMany({ where: { hospitalId } })
  if (vendors.length > 0) {
    const workTypes: LabWorkType[] = [
      LabWorkType.CROWN,
      LabWorkType.BRIDGE,
      LabWorkType.DENTURE,
      LabWorkType.IMPLANT_CROWN,
      LabWorkType.VENEER,
      LabWorkType.NIGHT_GUARD,
      LabWorkType.RETAINER,
    ]
    const statuses: LabOrderStatus[] = [
      LabOrderStatus.SENT_TO_LAB,
      LabOrderStatus.IN_PROGRESS,
      LabOrderStatus.QUALITY_CHECK,
      LabOrderStatus.READY,
      LabOrderStatus.DELIVERED,
      LabOrderStatus.FITTED,
    ]
    for (let i = 0; i < 12; i++) {
      const orderNumber = `LAB-D${String(i + 1).padStart(3, '0')}`
      const patient = patients[(i * 4) % patients.length]
      const offset = -int(2, 40)
      await prisma.labOrder.upsert({
        where: { hospitalId_orderNumber: { hospitalId, orderNumber } },
        update: {},
        create: {
          hospitalId,
          orderNumber,
          patientId: patient.id,
          labVendorId: vendors[i % vendors.length].id,
          workType: workTypes[i % workTypes.length],
          description: 'Shade match requested. Please follow the attached prescription.',
          toothNumbers: pick(['16', '26', '36', '46', '11,21']),
          shadeGuide: pick(['A2', 'A3', 'B1', 'VITA 3D-Master 2M2']),
          orderDate: day(offset),
          expectedDate: day(offset + int(5, 12)),
          sentDate: day(offset),
          receivedDate: offset < -20 ? day(offset + int(6, 10)) : null,
          deliveredDate: offset < -25 ? day(offset + int(7, 12)) : null,
          estimatedCost: rupee(int(1500, 12000)),
          actualCost: offset < -20 ? rupee(int(1500, 12000)) : null,
          status: statuses[i % statuses.length],
          priority: chance(0.2) ? LabOrderPriority.URGENT : LabOrderPriority.NORMAL,
          notes: 'Patient informed about expected delivery timeline.',
        },
      })
    }
  }

  // -------------------------------------------------------------- dental chart
  const conditions: ToothCondition[] = [
    ToothCondition.CARIES,
    ToothCondition.FILLED,
    ToothCondition.ROOT_CANAL,
    ToothCondition.CROWN,
    ToothCondition.MISSING,
    ToothCondition.SENSITIVE,
  ]
  for (let i = 0; i < 36; i++) {
    const patient = patients[(i * 7) % patients.length]
    const toothNumber = int(11, 48)
    const condition = conditions[i % conditions.length]
    const exists = await prisma.dentalChartEntry.findFirst({
      where: { patientId: patient.id, toothNumber, condition },
    })
    if (!exists) {
      await prisma.dentalChartEntry.create({
        data: {
          hospitalId,
          patientId: patient.id,
          toothNumber,
          toothNotation: 'FDI',
          condition,
          severity: i % 3 === 0 ? Severity.MODERATE : Severity.MILD,
          notes: 'Recorded during routine examination.',
          diagnosedDate: day(-int(5, 300)),
        },
      })
    }
  }

  console.log('Demo clinic dataset ready.')
  console.log('  Login: admin@demo-dental.com / Admin@123')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
