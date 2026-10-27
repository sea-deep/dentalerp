import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import QRCode from 'qrcode'
import { readFile } from 'fs/promises'
import path from 'path'
import { upiPaymentUri } from '@/lib/upi'
import { prisma } from '@/lib/prisma'
export async function generateClinicPdf(
  hospitalId: string,
  kind: 'INVOICE' | 'PRESCRIPTION',
  id: string
) {
  const hospital = await prisma.hospital.findUniqueOrThrow({ where: { id: hospitalId } })
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const fontBytes = await readFile(
    path.join(process.cwd(), 'public/fonts/inter/Inter-PDF-Regular.ttf')
  )
  const font = await pdf.embedFont(fontBytes, { subset: true })
  let page = pdf.addPage([595, 842]),
    y = 790
  function line(value: string, size = 11) {
    // Wrap by actual glyph widths, including long unbroken strings.
    const words = String(value).replace(/\r/g, '').split(/\s+/)
    let current = ''
    function draw(text: string) {
      if (y < 65) {
        page = pdf.addPage([595, 842])
        y = 790
      }
      page.drawText(text, { x: 45, y, size, font, color: rgb(0.12, 0.17, 0.2) })
      y -= size + 8
    }
    for (const word of words) {
      if (current && font.widthOfTextAtSize(`${current} ${word}`, size) > 505) {
        draw(current)
        current = ''
      }
      for (const char of word) {
        if (font.widthOfTextAtSize(current + char, size) > 505) {
          draw(current)
          current = ''
        }
        current += char
      }
      current += ' '
    }
    if (current.trim()) draw(current.trim())
  }
  line(hospital.name, 22)
  line(
    [hospital.address, hospital.city, hospital.state, hospital.pincode].filter(Boolean).join(', '),
    10
  )
  line([hospital.phone, hospital.email].filter(Boolean).join(' | '), 10)
  if (hospital.registrationNo) line(`Clinic registration: ${hospital.registrationNo}`, 10)
  y -= 12
  let filename: string
  if (kind === 'INVOICE') {
    const invoice = await prisma.invoice.findFirst({
      where: { id, hospitalId },
      include: { patient: true, items: true },
    })
    if (!invoice) throw new Error('Invoice not found')
    filename = `${invoice.invoiceNo}.pdf`
    line(`${hospital.gstNumber ? 'Tax invoice' : 'Invoice'} ${invoice.invoiceNo}`, 16)
    line(`Date: ${invoice.createdAt.toISOString().slice(0, 10)} | Status: ${invoice.status}`, 10)
    if (hospital.gstNumber) line(`GSTIN: ${hospital.gstNumber}`, 10)
    line(
      `Patient: ${invoice.patient.firstName} ${invoice.patient.lastName} | ${invoice.patient.patientId}`
    )
    line(`Phone: ${invoice.patient.phone}`, 10)
    y -= 10
    for (const item of invoice.items)
      line(
        `${item.description} | ${item.quantity} x INR ${Number(item.unitPrice).toFixed(2)} = INR ${Number(item.amount).toFixed(2)}`
      )
    y -= 12
    line(`Subtotal: INR ${Number(invoice.subtotal).toFixed(2)}`)
    line(`Discount: INR ${Number(invoice.discountAmount).toFixed(2)}`)
    line(`CGST (${Number(invoice.cgstRate)}%): INR ${Number(invoice.cgstAmount).toFixed(2)}`)
    line(`SGST (${Number(invoice.sgstRate)}%): INR ${Number(invoice.sgstAmount).toFixed(2)}`)
    line(`Total: INR ${Number(invoice.totalAmount).toFixed(2)}`, 14)
    line(
      `Paid: INR ${Number(invoice.paidAmount).toFixed(2)} | Balance: INR ${Number(invoice.balanceAmount).toFixed(2)}`,
      12
    )
    if (invoice.dueDate) line(`Due: ${invoice.dueDate.toISOString().slice(0, 10)}`, 10)
    if (invoice.notes) line(invoice.notes, 10)
    if (invoice.termsAndConditions) line(invoice.termsAndConditions, 10)
    if (
      hospital.upiId &&
      Number(invoice.balanceAmount) > 0 &&
      !['DRAFT', 'CANCELLED', 'REFUNDED'].includes(invoice.status)
    ) {
      if (y < 230) {
        page = pdf.addPage([595, 842])
        y = 790
      }
      line(`Scan to pay INR ${Number(invoice.balanceAmount).toFixed(2)} by UPI`)
      const qr = await QRCode.toBuffer(
        upiPaymentUri(
          hospital.upiId,
          hospital.name,
          Number(invoice.balanceAmount),
          invoice.invoiceNo
        ),
        { width: 320, margin: 2 }
      )
      const image = await pdf.embedPng(qr)
      page.drawImage(image, { x: 45, y: y - 150, width: 150, height: 150 })
      y -= 175
      line(`UPI ID: ${hospital.upiId}`, 10)
      line('Payment is recorded by the clinic after verification.', 9)
    }
  } else {
    const prescription = await prisma.prescription.findFirst({
      where: { id, hospitalId },
      include: { patient: true, doctor: true, medications: true },
    })
    if (!prescription) throw new Error('Prescription not found')
    filename = `${prescription.prescriptionNo}.pdf`
    line(`Prescription ${prescription.prescriptionNo}`, 16)
    line(`Date: ${prescription.createdAt.toISOString().slice(0, 10)}`, 10)
    line(`Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName}`)
    if (prescription.doctor.licenseNumber)
      line(`Registration: ${prescription.doctor.licenseNumber}`, 10)
    line(
      `Patient: ${prescription.patient.firstName} ${prescription.patient.lastName} | ${prescription.patient.patientId}`
    )
    if (prescription.diagnosis) line(`Diagnosis: ${prescription.diagnosis}`)
    y -= 12
    for (const [index, medicine] of prescription.medications.entries()) {
      line(`${index + 1}. ${medicine.medicationName}`, 13)
      line(`${medicine.dosage} | ${medicine.frequency} | ${medicine.duration} | ${medicine.route}`)
      if (medicine.timing) line(`Timing: ${medicine.timing}`, 10)
      if (medicine.quantity) line(`Quantity: ${medicine.quantity}`, 10)
      if (medicine.instructions) line(medicine.instructions, 10)
      y -= 8
    }
    if (prescription.notes) line(`Advice: ${prescription.notes}`)
    if (prescription.validUntil)
      line(`Valid until: ${prescription.validUntil.toISOString().slice(0, 10)}`, 10)
  }
  pdf.setTitle(filename.replace(/\.pdf$/, ''))
  pdf.setAuthor(hospital.name)
  for (const [index, p] of pdf.getPages().entries())
    p.drawText(`${hospital.name} | ${index + 1} / ${pdf.getPageCount()}`, {
      x: 45,
      y: 30,
      size: 8,
      font,
    })
  return { bytes: await pdf.save(), filename }
}
