'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/billing-utils'
import { formatDoctorName } from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Wallet,
  Stethoscope,
  Plus,
  ClipboardCheck,
} from 'lucide-react'

interface PatientClinicalSummaryProps {
  patient: any
  onTabChange?: (tab: string) => void
  compact?: boolean
}

export function PatientClinicalSummary({
  patient,
  onTabChange,
  compact = false,
}: PatientClinicalSummaryProps) {
  const { data: session } = useSession()
  const clinicalAccess = ['ADMIN', 'DOCTOR'].includes(session?.user?.role || '')
  if (!patient) return null

  const allergies = patient.medicalHistory?.allergies || []
  const chronicConditions = patient.medicalHistory?.chronicConditions || []
  const currentMedications = patient.medicalHistory?.currentMedications || []

  // Upcoming appointment
  const now = new Date()
  const nextAppt = (patient.appointments || [])
    .filter((a: any) => new Date(a.scheduledDate) >= now && a.status !== 'CANCELLED')
    .sort(
      (a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    )[0]

  // Outstanding balance
  const balanceDue = (patient.invoices || []).reduce((sum: number, inv: any) => {
    if (inv.status === 'CANCELLED') return sum
    const bal =
      inv.balanceAmount !== undefined
        ? Number(inv.balanceAmount)
        : Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))
    return sum + bal
  }, 0)

  // In-progress treatments
  const activeTreatmentsCount = (patient.treatments || []).filter(
    (t: any) => t.status === 'IN_PROGRESS' || t.status === 'PLANNED'
  ).length

  const hasHighRiskAlert =
    allergies.length > 0 ||
    chronicConditions.some((c: string) =>
      /cardiac|heart|bleed|hypertens|diabet|anticoag|asthma|penicillin/i.test(c)
    )

  return (
    <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Top Banner: Medical Alerts & Patient Safety */}
      <div
        className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
          hasHighRiskAlert
            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80'
            : 'bg-muted/30 border-border'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {hasHighRiskAlert ? (
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold text-xs tracking-tight">
              <AlertTriangle className="h-[18px] w-[18px]" />
              <span>Recorded alerts</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-xs tracking-tight">
              <CheckCircle2 className="h-[18px] w-[18px]" />
              <span>Medical history</span>
            </div>
          )}

          {/* Allergies Chips */}
          {allergies.length > 0 ? (
            allergies.map((allergy: string, i: number) => (
              <Badge
                key={i}
                className="bg-rose-700 hover:bg-rose-800 text-white font-medium text-[11px] px-2.5 py-0.5 rounded-full shadow-xs"
              >
                Allergy: {allergy}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="border-border text-muted-foreground text-[11px]">
              No allergies recorded · confirm with patient
            </Badge>
          )}

          {/* Chronic conditions chips */}
          {chronicConditions.map((cond: string, i: number) => (
            <Badge
              key={i}
              variant="outline"
              className="bg-amber-100/70 text-amber-800 border-amber-300 text-[11px] font-medium dark:text-amber-200"
            >
              {cond}
            </Badge>
          ))}

          {/* Current medications note */}
          {currentMedications.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-medium">
              Meds: {currentMedications.join(', ')}
            </span>
          )}
        </div>

        {/* Quick Dental Chart Switch button */}
        {onTabChange && !compact && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTabChange('dental-chart')}
            className="h-7 text-xs gap-1 border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-950/60"
          >
            <Stethoscope className="h-4 w-4" />
            Open Odontogram
          </Button>
        )}
      </div>

      {/* Metric Cards & Quick Clinical Actions */}
      {!compact && (
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Next Appointment Card */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Next Appointment
              </span>
              {nextAppt ? (
                <>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatDate(nextAppt.scheduledDate)}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {nextAppt.doctor
                      ? formatDoctorName(nextAppt.doctor.firstName, nextAppt.doctor.lastName)
                      : 'Scheduled'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">No upcoming visit scheduled</p>
              )}
            </div>
          </div>

          {/* Financial Balance Card */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <div
              className={`p-2 rounded-lg ${
                balanceDue > 0
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <p
                className={`text-xs font-bold font-mono ${
                  balanceDue > 0
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {formatCurrency(balanceDue)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {balanceDue > 0 ? 'Payment pending' : 'Account in good standing'}
              </p>
            </div>
          </div>

          {/* Active Treatments Card */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Active treatments
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {activeTreatmentsCount} Active / In-Progress
              </p>
              <p className="text-[11px] text-muted-foreground">
                Total {patient._count?.treatments || 0} documented
              </p>
            </div>
          </div>

          {/* Clinical Quick Action Bar */}
          {clinicalAccess && (
            <div className="flex flex-col justify-center gap-1.5">
              <Link href={`/treatments/new?patientId=${patient.id}`} className="w-full">
                <Button size="sm" className="w-full h-8 text-xs font-medium justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Record treatment
                </Button>
              </Link>
              <Link href={`/prescriptions/new?patientId=${patient.id}`} className="w-full">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs font-medium justify-start gap-2"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Write Prescription
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
