'use client'

import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { upiPaymentUri } from '@/lib/upi'
import {
  formatCurrency,
  formatDate,
  numberToWords,
  invoiceStatusConfig,
  paymentMethodConfig,
} from '@/lib/billing-utils'

export interface InvoiceClinic {
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  gstNumber?: string | null
  upiId?: string | null
  registrationNo?: string | null
}

interface PrintableInvoiceProps {
  invoice: any
  clinic?: InvoiceClinic | null
}

export function PrintableInvoice({ invoice, clinic }: PrintableInvoiceProps) {
  const [upiQr, setUpiQr] = useState('')
  useEffect(() => {
    setUpiQr('')
    if (
      !clinic?.upiId ||
      !invoice ||
      Number(invoice.balanceAmount) <= 0 ||
      ['DRAFT', 'CANCELLED', 'REFUNDED'].includes(invoice.status)
    )
      return
    let active = true
    QRCode.toDataURL(
      upiPaymentUri(clinic.upiId, clinic.name, Number(invoice.balanceAmount), invoice.invoiceNo),
      { width: 240, margin: 2 }
    ).then((url) => {
      if (active) setUpiQr(url)
    })
    return () => {
      active = false
    }
  }, [clinic?.upiId, clinic?.name, invoice?.balanceAmount, invoice?.invoiceNo, invoice?.status])
  if (!invoice) return null

  const clinicName = clinic?.name || 'Dental Clinic'
  const clinicAddress = clinic?.address || ''
  const clinicPhone = clinic?.phone || ''
  const clinicEmail = clinic?.email || ''
  const clinicGstin = clinic?.gstNumber || ''
  const hasGst = Boolean(clinicGstin)

  const doctor = invoice.items?.[0]?.treatment?.doctor
  const doctorName = doctor
    ? `${/^dr\.?\s/i.test(doctor.firstName) ? '' : 'Dr. '}${doctor.firstName} ${doctor.lastName}`
    : null

  const numWords = numberToWords(Number(invoice.totalAmount || 0))
  const statusLabel =
    invoiceStatusConfig[invoice.status as keyof typeof invoiceStatusConfig]?.label || invoice.status
  const paymentMethodLabel = (method: string) =>
    paymentMethodConfig[method as keyof typeof paymentMethodConfig]?.label ||
    method.replaceAll('_', ' ')

  const clinicInitial = clinicName.trim().charAt(0).toUpperCase() || 'D'

  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto font-sans text-xs border border-slate-200 rounded-xl print:border-0 print:p-0 print:m-0 print:max-w-none">
      {/* Clinic & Tax Header */}
      <div className="flex justify-between items-start border-b border-slate-300 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-lg bg-cyan-800 text-white font-bold text-base flex items-center justify-center">
              {clinicInitial}
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">{clinicName}</span>
          </div>
          {clinicAddress && (
            <p className="text-slate-600 text-xs leading-relaxed max-w-xs">{clinicAddress}</p>
          )}
          <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
            <p>
              Phone: <span className="text-slate-800">{clinicPhone}</span> | Email:{' '}
              <span className="text-slate-800">{clinicEmail}</span>
            </p>
            <p>
              GSTIN: <span className="font-mono font-medium text-slate-800">{clinicGstin}</span> |
              SAC Code: <span className="font-mono font-medium text-slate-800">999312</span> (Dental
              Healthcare)
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[11px] rounded mb-2">
            {hasGst ? 'Tax Invoice' : 'Bill of Supply'}
          </span>
          <div className="space-y-1">
            <p className="text-slate-500 text-[11px]">Invoice Number</p>
            <p className="text-base font-bold font-mono text-slate-900">{invoice.invoiceNo}</p>
            <p className="text-slate-500 text-[11px] mt-1">
              Date:{' '}
              <span className="text-slate-800 font-medium">{formatDate(invoice.invoiceDate)}</span>
            </p>
            {invoice.dueDate && (
              <p className="text-slate-500 text-[11px]">
                Due Date:{' '}
                <span className="text-slate-800 font-medium">{formatDate(invoice.dueDate)}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bill To & Attending Doctor */}
      <div className="grid grid-cols-2 gap-8 border-b border-slate-200 pb-6 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Billed To (Patient)
          </span>
          <p className="text-sm font-bold text-slate-900">
            {invoice.patient.firstName} {invoice.patient.lastName}
          </p>
          <div className="text-slate-600 text-xs mt-1 space-y-0.5">
            <p>
              Patient ID:{' '}
              <span className="font-mono font-medium text-slate-800">
                {invoice.patient.patientId}
              </span>
            </p>
            <p>Phone: {invoice.patient.phone}</p>
            {invoice.patient.email && <p>Email: {invoice.patient.email}</p>}
            {invoice.patient.address && (
              <p className="text-slate-500">
                {invoice.patient.address}
                {invoice.patient.city ? `, ${invoice.patient.city}` : ''}
                {invoice.patient.state ? ` (${invoice.patient.state})` : ''}
              </p>
            )}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Clinical Reference
          </span>
          {doctorName ? (
            <p className="text-sm font-semibold text-slate-800">{doctorName}</p>
          ) : (
            <p className="text-sm font-semibold text-slate-800">Dental Services</p>
          )}
          <div className="text-slate-600 text-xs mt-1 space-y-0.5">
            <p>
              Payment Status: <span className="font-bold text-slate-900">{statusLabel}</span>
            </p>
            {invoice.insuranceClaim && (
              <p className="text-sky-700">
                Insurance Claim Ref: {invoice.insuranceClaim.claimNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      {upiQr && (
        <div className="mb-6 flex items-center gap-4">
          <img
            src={upiQr}
            alt={`UPI payment QR for ${invoice.invoiceNo}`}
            width={120}
            height={120}
          />
          <div>
            <p className="font-semibold">Scan to pay the outstanding balance</p>
            <p>{formatCurrency(Number(invoice.balanceAmount))}</p>
            <p>{clinic?.upiId}</p>
          </div>
        </div>
      )}
      {/* Line Items Table */}
      <div className="mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[11px] uppercase tracking-wider text-slate-700">
              <th className="py-2.5 font-bold w-10">#</th>
              <th className="py-2.5 font-bold">Procedure / Description</th>
              <th className="py-2.5 font-bold text-center w-24">SAC Code</th>
              <th className="py-2.5 font-bold text-right w-16">Qty</th>
              <th className="py-2.5 font-bold text-right w-24">Rate (₹)</th>
              <th className="py-2.5 font-bold text-right w-28">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items?.map((item: any, idx: number) => (
              <tr key={item.id} className="text-xs">
                <td className="py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                <td className="py-2.5">
                  <p className="font-semibold text-slate-900">{item.description}</p>
                  {item.treatment?.procedure?.code && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      Code: {item.treatment.procedure.code}
                      {item.treatment.toothNumbers
                        ? ` • Tooth: ${item.treatment.toothNumbers}`
                        : ''}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-center font-mono text-slate-500">999312</td>
                <td className="py-2.5 text-right font-mono">{item.quantity}</td>
                <td className="py-2.5 text-right font-mono">
                  {formatCurrency(item.unitPrice).replace('₹', '')}
                </td>
                <td className="py-2.5 text-right font-mono font-semibold text-slate-900">
                  {formatCurrency(item.amount).replace('₹', '')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tax & Financial Summary Block */}
      <div className="grid grid-cols-2 gap-8 border-t border-slate-300 pt-4 mb-6">
        <div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 mb-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
              Amount in Words
            </span>
            <p className="font-medium text-slate-800 text-xs italic">Rupees {numWords} Only</p>
          </div>

          {/* Payment Receipts applied */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Receipts Recorded
              </span>
              <div className="space-y-1">
                {invoice.payments.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex justify-between text-[11px] bg-slate-50/80 px-2.5 py-1 rounded border border-slate-200/60 font-mono"
                  >
                    <span>
                      {p.paymentNo} ({paymentMethodLabel(p.paymentMethod)})
                    </span>
                    <span>{formatDate(p.paymentDate)}</span>
                    <span className="font-semibold text-emerald-700">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Calculation Table */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-mono text-slate-900">{formatCurrency(invoice.subtotal)}</span>
          </div>

          {Number(invoice.discountAmount || 0) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>
                Discount (
                {invoice.discountType === 'PERCENTAGE' ? `${invoice.discountValue}%` : 'Fixed'})
              </span>
              <span className="font-mono">- {formatCurrency(invoice.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-600">
            <span>Taxable Value</span>
            <span className="font-mono text-slate-900">
              {formatCurrency(invoice.taxableAmount)}
            </span>
          </div>

          {Number(invoice.cgstAmount || 0) > 0 && (
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>CGST ({invoice.cgstRate || 9}%)</span>
              <span className="font-mono text-slate-800">{formatCurrency(invoice.cgstAmount)}</span>
            </div>
          )}

          {Number(invoice.sgstAmount || 0) > 0 && (
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>SGST ({invoice.sgstRate || 9}%)</span>
              <span className="font-mono text-slate-800">{formatCurrency(invoice.sgstAmount)}</span>
            </div>
          )}

          <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm font-bold text-slate-900">
            <span>Total Invoice Amount</span>
            <span className="font-mono">{formatCurrency(invoice.totalAmount)}</span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>Total Paid</span>
            <span className="font-mono text-emerald-700 font-semibold">
              {formatCurrency(invoice.paidAmount)}
            </span>
          </div>

          <div className="flex justify-between p-2 rounded bg-slate-100 font-bold text-slate-900 border">
            <span>Balance Due</span>
            <span className="font-mono text-rose-700">{formatCurrency(invoice.balanceAmount)}</span>
          </div>
        </div>
      </div>

      {/* Footer Notes & Signatures */}
      <div className="border-t border-slate-200 pt-6 mt-6 flex justify-between items-end text-slate-500 text-[10px]">
        <div className="max-w-sm space-y-1">
          <p className="font-semibold text-slate-700">Terms & Conditions:</p>
          <p>1. Invoices are due on presentation unless prior credit arrangements exist.</p>
          <p>
            2. Dental healthcare services fall under SAC 999312 exempted or taxed per current GST
            Council notifications.
          </p>
          <p>3. This is a computer generated tax invoice.</p>
        </div>

        <div className="text-center w-48">
          <div className="h-12 border-b border-slate-400 mb-2 flex items-end justify-center">
            <span className="text-[10px] text-slate-400 italic mb-1">
              [Authorized Stamp / Signature]
            </span>
          </div>
          <p className="font-semibold text-slate-800 text-xs">For {clinicName}</p>
          <p className="text-[10px] text-slate-500">Authorized Signatory</p>
        </div>
      </div>
    </div>
  )
}
