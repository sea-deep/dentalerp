import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createHash, randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
if (!process.env.DATABASE_URL) process.loadEnvFile('.env')
const db = new PrismaClient()
const suffix = randomUUID().slice(0, 8),
  slug = `parity-qa-${suffix}`,
  password = 'ParityQA@123'
let hospitalId: string,
  doctorId: string,
  adminEmail: string,
  receptionId: string,
  receptionEmail: string
const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
const artifacts = '/tmp/dental-parity-qa'
test.describe.configure({ mode: 'serial' })
test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 10)
  const hospital = await db.hospital.create({
    data: {
      name: 'Parity QA Dental',
      slug,
      email: `clinic-${suffix}@example.test`,
      phone: '9876543210',
      address: 'Synthetic QA clinic',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      isActive: true,
      patientPortalEnabled: true,
      onboardingCompleted: true,
      patientLimit: -1,
      upiId: 'qa@upi',
      workingHours: JSON.stringify({
        start: '09:00',
        end: '18:00',
        lunchStart: '13:00',
        lunchEnd: '14:00',
      }),
    },
  })
  hospitalId = hospital.id
  adminEmail = `admin-${suffix}@example.test`
  receptionEmail = `reception-${suffix}@example.test`
  await db.user.create({
    data: {
      hospitalId,
      email: adminEmail,
      password: passwordHash,
      name: 'QA Administrator',
      role: 'ADMIN',
    },
  })
  const doctor = await db.user.create({
    data: {
      hospitalId,
      email: `doctor-${suffix}@example.test`,
      password: passwordHash,
      name: 'QA Doctor',
      role: 'DOCTOR',
      staff: {
        create: {
          hospitalId,
          employeeId: 'QA-D1',
          firstName: 'Synthetic',
          lastName: 'Doctor',
          phone: '9876543211',
          email: `doctor-${suffix}@example.test`,
          licenseNumber: 'QA-TEST-ONLY',
        },
      },
    },
    include: { staff: true },
  })
  doctorId = doctor.staff!.id
  const reception = await db.user.create({
    data: {
      hospitalId,
      email: receptionEmail,
      password: passwordHash,
      name: 'QA Reception',
      role: 'RECEPTIONIST',
    },
  })
  receptionId = reception.id
  await db.procedure.create({
    data: {
      hospitalId,
      code: 'QA-CONSULT',
      name: 'Dental consultation',
      category: 'DIAGNOSTIC',
      basePrice: 500,
    },
  })
  await mkdir(artifacts, { recursive: true })
})
test.afterAll(async () => {
  if (hospitalId) {
    await db.invoice.deleteMany({ where: { hospitalId } })
    await db.prescription.deleteMany({ where: { hospitalId } })
    await db.appointment.deleteMany({ where: { hospitalId } })
    const patients = await db.patient.findMany({ where: { hospitalId }, select: { id: true } })
    await db.patientCommunicationPreference.deleteMany({
      where: { patientId: { in: patients.map((p) => p.id) } },
    })
    await db.patient.deleteMany({ where: { hospitalId } })
    await db.staff.deleteMany({ where: { hospitalId } })
    await db.hospital.delete({ where: { id: hospitalId } })
  }
  await db.$disconnect()
})
test('complete clinic acquisition, operations, documents and access workflows', async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(240000)
  page.setDefaultTimeout(20000)
  page.setDefaultNavigationTimeout(60000)
  page.on('pageerror', (error) => console.log('BROWSER_ERROR', error.message))
  // The public clinic page reads actual clinic and service records.
  await page.goto(`/clinic/${slug}`)
  await expect(page.getByRole('heading', { name: 'Parity QA Dental', exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Dental consultation', exact: true })
  ).toBeVisible()
  await page.screenshot({
    path: `${artifacts}/clinic-desktop.png`,
    fullPage: true,
    animations: 'disabled',
  })
  const draft = await request.post(`/api/public/${slug}/enquiries`, {
    data: {
      name: 'Synthetic Patient',
      phone: '9876543212',
      message: 'Synthetic booking test',
      consent: true,
      kind: 'BOOKING',
    },
  })
  expect(draft.status()).toBe(201)
  const intent = await draft.json()
  expect(
    (
      await request.post(`/api/public/${slug}/book`, {
        data: { phone: '9876543212', doctorId, date, time: '10:00' },
      })
    ).status()
  ).toBe(401)
  // Inject only a synthetic code in the test DB; real provider sends are never exercised.
  const otp = '123456'
  await db.patientOTP.create({
    data: {
      hospitalId,
      phone: `booking:${intent.id}`,
      otp: createHash('sha256').update(`${intent.id}:${otp}`).digest('hex'),
      expiresAt: new Date(Date.now() + 300000),
    },
  })
  expect(
    (
      await request.post(`/api/public/${slug}/verify`, {
        data: { token: intent.token, otp: '000000' },
      })
    ).status()
  ).toBe(400)
  expect(
    (
      await request.post(`/api/public/${slug}/verify`, { data: { token: intent.token, otp } })
    ).status()
  ).toBe(200)
  expect(
    (
      await request.post(`/api/public/${slug}/book`, {
        data: { token: intent.token, doctorId, date, time: '10:00' },
      })
    ).status()
  ).toBe(201)
  expect(await db.appointment.count({ where: { hospitalId } })).toBe(0)
  // Staff authentication, pending request approval, conflict prevention and patient UHID.
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(adminEmail)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto('/appointments/requests')
  await expect(page.getByText('Synthetic Patient', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm action' }).click()
  await expect(page.getByText('Enquiry updated.')).toBeVisible()
  const enquiry = await db.clinicEnquiry.findUniqueOrThrow({ where: { id: intent.id } })
  expect(enquiry.status).toBe('APPROVED')
  const patient = await db.patient.findUniqueOrThrow({ where: { id: enquiry.patientId! } })
  expect(patient.patientId).toMatch(/^\d{8}$/)
  const slots = await (
    await request.get(`/api/public/${slug}/slots?doctorId=${doctorId}&date=${date}`)
  ).json()
  expect(slots.slots.find((s: any) => s.time === '10:00').available).toBe(false)
  const replay = await page.request.patch(`/api/enquiries/${intent.id}`, {
    data: { action: 'APPROVE' },
  })
  expect(replay.status()).toBe(409)
  const careProfile = {
    assignedDoctorId: doctorId,
    weightKg: 65,
    heightCm: 170,
    systolicBP: 120,
    diastolicBP: 80,
    pulse: 72,
    temperatureC: 36.8,
    pastSurgeries: 'Synthetic surgery history',
  }
  expect(
    (
      await page.request.put(`/api/patients/${patient.id}/care-profile`, {
        data: { ...careProfile, weightKg: -1 },
      })
    ).status()
  ).toBe(400)
  expect(
    (
      await page.request.put(`/api/patients/${patient.id}/care-profile`, { data: careProfile })
    ).status()
  ).toBe(200)
  expect(
    (await (await page.request.get(`/api/patients/${patient.id}/care-profile`)).json()).profile
  ).toMatchObject(careProfile)
  // Exercise the expense UI, including its custom date picker and form payload.
  await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === '/api/expenses'),
    page.goto('/billing/expenses'),
  ])
  await page.getByLabel('Description', { exact: true }).fill('Synthetic rent')
  await page.getByLabel('Category', { exact: true }).selectOption('RENT')
  await page.getByLabel('Amount (INR)').fill('12000')
  await page.getByLabel('Expense date', { exact: true }).click()
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await page.getByRole('button', { name: 'Record expense' }).click()
  await expect(page.getByText('Expense recorded.', { exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Synthetic rent', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Today', exact: true })).toHaveCount(0)
  await page.screenshot({
    path: `${artifacts}/expenses-desktop.png`,
    fullPage: true,
    animations: 'disabled',
  })
  const expenses = await (await page.request.get('/api/expenses')).json()
  expect(expenses.total).toBe(12000)
  // Diagnostic orders and saved reference lists.
  expect(
    (
      await page.request.post('/api/clinical-references', {
        data: { kind: 'DIAGNOSIS', label: 'Synthetic diagnostic finding' },
      })
    ).status()
  ).toBe(201)
  const orderResponse = await page.request.post('/api/diagnostics', {
    data: {
      patientId: patient.id,
      doctorId,
      kind: 'RADIOGRAPH',
      testName: 'QA OPG',
      instructions: 'Synthetic order',
    },
  })
  expect(orderResponse.status()).toBe(201)
  const order = await orderResponse.json()
  expect(
    (
      await page.request.patch(`/api/diagnostics/${order.id}`, { data: { status: 'REPORTED' } })
    ).status()
  ).toBe(400)
  expect(
    (
      await page.request.patch(`/api/diagnostics/${order.id}`, {
        data: { status: 'REPORTED', result: 'Synthetic report complete' },
      })
    ).status()
  ).toBe(200)
  await page.goto('/diagnostics')
  await expect(page.getByText('QA OPG · REPORTED')).toBeVisible()
  // Branded invoice and prescription PDFs with embedded UPI QR; no external media fetch.
  const invoiceResponse = await page.request.post('/api/invoices', {
    data: {
      patientId: patient.id,
      status: 'PENDING',
      items: [
        { description: 'Synthetic consultation', quantity: 1, unitPrice: 500, taxable: false },
      ],
    },
  })
  expect(invoiceResponse.status()).toBe(201)
  const invoice = await invoiceResponse.json()
  const invoicePdf = await page.request.get(`/api/invoices/${invoice.id}/pdf`)
  expect(invoicePdf.status()).toBe(200)
  expect(invoicePdf.headers()['content-type']).toContain('application/pdf')
  const pdf = await invoicePdf.body()
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  await writeFile(`${artifacts}/invoice.pdf`, pdf)
  const prescription = await db.prescription.create({
    data: {
      hospitalId,
      patientId: patient.id,
      doctorId,
      prescriptionNo: 'QA-RX',
      diagnosis: 'Synthetic diagnosis',
      notes: 'Synthetic advice',
      medications: {
        create: {
          medicationName: 'Synthetic medicine',
          dosage: 'Test dose',
          frequency: 'Test frequency',
          duration: 'Test duration',
        },
      },
    },
  })
  const rxPdf = await page.request.get(`/api/prescriptions/${prescription.id}/pdf`)
  expect(rxPdf.status()).toBe(200)
  await writeFile(`${artifacts}/prescription.pdf`, await rxPdf.body())
  // Uploaded photos stay private while in draft and after unpublishing.
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=',
    'base64'
  )
  const uploaded = await page.request.post('/api/website/upload', {
    multipart: {
      title: 'Synthetic before and after',
      body: 'QA images only',
      consent: 'on',
      before: { name: 'before.png', mimeType: 'image/png', buffer: image },
      after: { name: 'after.png', mimeType: 'image/png', buffer: image },
    },
  })
  expect(uploaded.status()).toBe(201)
  const photo = await uploaded.json()
  expect((await request.get(photo.imageUrl)).status()).toBe(404)
  expect(
    (await page.request.patch(`/api/website/${photo.id}`, { data: { published: true } })).status()
  ).toBe(200)
  expect((await request.get(photo.imageUrl)).status()).toBe(200)
  expect(
    (await page.request.patch(`/api/website/${photo.id}`, { data: { published: false } })).status()
  ).toBe(200)
  expect((await request.get(photo.imageUrl)).status()).toBe(404)
  expect((await page.request.delete(`/api/website/${photo.id}`)).status()).toBe(200)
  // Moderation is reflected immediately in the public site.
  const reviewResponse = await page.request.post('/api/website', {
    data: {
      kind: 'REVIEW',
      title: 'Synthetic reviewer',
      body: 'Synthetic review used only for QA.',
      rating: 5,
      consent: true,
      published: false,
    },
  })
  expect(reviewResponse.status()).toBe(201)
  const review = await reviewResponse.json()
  await page.goto(`/clinic/${slug}`)
  await expect(page.getByText('Synthetic review used only for QA.')).toHaveCount(0)
  expect(
    (await page.request.patch(`/api/website/${review.id}`, { data: { published: true } })).status()
  ).toBe(200)
  await page.reload()
  await expect(page.getByText('Synthetic review used only for QA.')).toBeVisible()
  // Review authentication returns to the same draft instead of stranding an entered review.
  const reviewForm = page.locator('#patient-review')
  await reviewForm.getByLabel('Your rating').selectOption('4')
  await reviewForm
    .getByLabel('Your review')
    .fill('Synthetic patient review preserved through sign-in.')
  await reviewForm.getByRole('checkbox').check()
  await reviewForm.getByRole('button', { name: 'Submit review' }).click()
  await expect(reviewForm.getByRole('status')).toContainText('Your draft will be here')
  await page.screenshot({
    path: `${artifacts}/review-sign-in.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await reviewForm.getByRole('link', { name: 'Sign in and return to your review' }).click()
  await expect(page).toHaveURL(/\/portal\/login\?.*returnTo=/)
  // Substitute only provider delivery. Verification, cookie creation and review submission use real APIs.
  await page.route('**/api/patient-portal/auth/send-otp', async (route) => {
    await db.patientOTP.create({
      data: {
        hospitalId,
        phone: patient.phone,
        otp: createHash('sha256').update(`portal:${patient.phone}:123456`).digest('hex'),
        expiresAt: new Date(Date.now() + 300000),
      },
    })
    await route.fulfill({ json: { success: true, message: 'Synthetic verification code' } })
  })
  await page.getByLabel('Phone Number', { exact: true }).fill(patient.phone)
  await page.getByRole('button', { name: 'Send OTP', exact: true }).click()
  await page.getByLabel('Verification Code', { exact: true }).fill('123456')
  await page.getByRole('button', { name: 'Verify & Login', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/clinic/${slug}#patient-review$`))
  await expect(reviewForm.getByLabel('Your review')).toHaveValue(
    'Synthetic patient review preserved through sign-in.'
  )
  await expect(reviewForm.getByLabel('Your rating')).toHaveValue('4')
  await reviewForm.getByRole('checkbox').check()
  await reviewForm.getByRole('button', { name: 'Submit review' }).click()
  await expect(reviewForm.getByRole('status')).toContainText('The clinic will review your feedback')
  expect(
    await db.websiteEntry.count({
      where: {
        hospitalId,
        kind: 'REVIEW',
        body: 'Synthetic patient review preserved through sign-in.',
        published: false,
      },
    })
  ).toBe(1)
  await expect(reviewForm.getByLabel('Your review')).toHaveValue('')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: `${artifacts}/clinic-mobile.png`,
    fullPage: true,
    animations: 'disabled',
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.setViewportSize({ width: 1440, height: 1000 })
  for (const [route, heading, file] of [
    ['/appointments/requests', 'Requests and enquiries', 'requests'],
    ['/diagnostics', 'Tests and radiographs', 'diagnostics'],
    [`/patients/${patient.id}`, 'Synthetic Patient', 'patient-care'],
    ['/settings/whatsapp', 'WhatsApp Business', 'whatsapp-settings'],
    ['/settings/website', 'Clinic website', 'website-settings'],
    ['/settings/access', 'Staff module access', 'staff-access'],
    ['/settings/clinical-references', 'Clinical reference lists', 'clinical-references'],
    ['/communications/whatsapp', 'WhatsApp message log', 'whatsapp-log'],
  ]) {
    await page.goto(route)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    await expect(page.getByText('Loading records…', { exact: true })).toHaveCount(0, {
      timeout: 60000,
    })
    await page.screenshot({
      path: `${artifacts}/${file}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  }
  // Per-person restrictions, cross-clinic access and immediate deactivation.
  expect(
    (await page.request.put(`/api/access/${receptionId}`, { data: { billing: false } })).status()
  ).toBe(200)
  const context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    }),
    receptionPage = await context.newPage()
  await receptionPage.goto('/login')
  await receptionPage.getByLabel('Email', { exact: true }).fill(receptionEmail)
  await receptionPage.getByLabel('Password', { exact: true }).fill(password)
  await receptionPage.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(receptionPage).toHaveURL(/dashboard/)
  expect((await receptionPage.request.get('/api/invoices')).status()).toBe(403)
  expect((await receptionPage.request.get('/api/prescriptions')).status()).toBe(403)
  const visiblePatient = await (
    await receptionPage.request.get(`/api/patients/${patient.id}`)
  ).json()
  expect(visiblePatient.patient.medicalHistory).toBeNull()
  expect(visiblePatient.patient.treatments).toEqual([])
  await db.user.update({ where: { id: receptionId }, data: { isActive: false } })
  expect((await receptionPage.request.get('/api/patients')).status()).toBe(401)
  await context.close()
  // New-device verification is enforced for credentials and mobile tokens.
  const administrator = await db.user.findFirstOrThrow({ where: { hospitalId, role: 'ADMIN' } })
  await db.setting.create({
    data: { hospitalId, key: 'requireTwoFactor', category: 'security', value: 'true' },
  })
  const deviceToken = 'a'.repeat(64),
    deviceHash = createHash('sha256').update(deviceToken).digest('hex'),
    deviceCode = '654321'
  const deviceContext = await browser.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  })
  await deviceContext.addCookies([
    { name: 'clinic-trusted-device', value: deviceToken, domain: 'localhost', path: '/' },
  ])
  expect(
    (
      await deviceContext.request.post('/api/auth/mobile-token', {
        data: { email: adminEmail, password },
      })
    ).status()
  ).toBe(403)
  await db.patientOTP.create({
    data: {
      hospitalId,
      phone: `staff:${administrator.id}:${deviceHash}`,
      otp: createHash('sha256')
        .update(`${administrator.id}:${deviceHash}:${deviceCode}`)
        .digest('hex'),
      expiresAt: new Date(Date.now() + 300000),
    },
  })
  expect(
    (
      await deviceContext.request.post('/api/auth/device', {
        data: { email: adminEmail, password, otp: '000000' },
      })
    ).status()
  ).toBe(400)
  expect(
    (
      await deviceContext.request.post('/api/auth/device', {
        data: { email: adminEmail, password, otp: deviceCode },
      })
    ).status()
  ).toBe(200)
  expect(
    (
      await deviceContext.request.post('/api/auth/mobile-token', {
        data: { email: adminEmail, password },
      })
    ).status()
  ).toBe(200)
  await deviceContext.close()
  // Void retains an audit record and removes the cost from active totals.
  expect(
    (
      await page.request.patch(`/api/expenses/${expenses.expenses[0].id}`, {
        data: { reason: 'Synthetic QA cleanup' },
      })
    ).status()
  ).toBe(200)
  expect((await (await page.request.get('/api/expenses')).json()).total).toBe(0)
})
