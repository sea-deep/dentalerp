import type { DentalChartEntry, DentitionType } from './dental-chart-types'

export const TOOTH_CONDITIONS = [
  { value: 'HEALTHY', label: 'Healthy', color: '#059669', bgClass: 'bg-emerald-600' },
  { value: 'CARIES', label: 'Caries', color: '#e11d48', bgClass: 'bg-rose-600' },
  { value: 'FILLED', label: 'Filled', color: '#2563eb', bgClass: 'bg-blue-600' },
  { value: 'CROWN', label: 'Crown', color: '#b45309', bgClass: 'bg-amber-700' },
  { value: 'ROOT_CANAL', label: 'Root canal', color: '#7c3aed', bgClass: 'bg-violet-600' },
  { value: 'IMPLANT', label: 'Implant', color: '#0891b2', bgClass: 'bg-cyan-600' },
  { value: 'BRIDGE', label: 'Bridge', color: '#c2410c', bgClass: 'bg-orange-700' },
  { value: 'MISSING', label: 'Missing', color: '#64748b', bgClass: 'bg-slate-500' },
  { value: 'EXTRACTION', label: 'Extraction', color: '#be123c', bgClass: 'bg-rose-700' },
  { value: 'FRACTURED', label: 'Fractured', color: '#a16207', bgClass: 'bg-yellow-700' },
  { value: 'SENSITIVE', label: 'Sensitive', color: '#0369a1', bgClass: 'bg-sky-700' },
  { value: 'ABSCESS', label: 'Abscess', color: '#9f1239', bgClass: 'bg-rose-800' },
  { value: 'PERIODONTAL', label: 'Periodontal', color: '#a21caf', bgClass: 'bg-fuchsia-700' },
  { value: 'MOBILITY', label: 'Mobility', color: '#9333ea', bgClass: 'bg-purple-600' },
]

export const SURFACES = [
  { key: 'mesial', short: 'M', label: 'Mesial' },
  { key: 'occlusal', short: 'O / I', label: 'Occlusal / incisal' },
  { key: 'distal', short: 'D', label: 'Distal' },
  { key: 'buccal', short: 'B / F', label: 'Buccal / facial' },
  { key: 'lingual', short: 'L / P', label: 'Lingual / palatal' },
] as const

export const EMPTY_SURFACES = {
  mesial: false,
  distal: false,
  occlusal: false,
  buccal: false,
  lingual: false,
}

export function groupEntries(entries: DentalChartEntry[]) {
  const grouped: Record<number, DentalChartEntry[]> = {}
  for (const entry of entries) (grouped[entry.toothNumber] ??= []).push(entry)
  for (const entries of Object.values(grouped))
    entries.sort(
      (a, b) => new Date(b.diagnosedDate).getTime() - new Date(a.diagnosedDate).getTime()
    )
  return grouped
}

export function isVisibleTooth(toothNumber: number, dentition: DentitionType) {
  return dentition === 'BOTH' || (dentition === 'ADULT' ? toothNumber < 50 : toothNumber > 50)
}

export function chartSummary(
  chartData: Record<number, DentalChartEntry[]>,
  dentition: DentitionType
) {
  const active = Object.entries(chartData)
    .filter(([tooth]) => isVisibleTooth(Number(tooth), dentition))
    .flatMap(([, entries]) => entries.filter((entry) => !entry.resolvedDate))
  return {
    charted: new Set(active.map((entry) => entry.toothNumber)).size,
    findings: active.filter((entry) => entry.condition !== 'HEALTHY').length,
    caries: new Set(
      active.filter((entry) => entry.condition === 'CARIES').map((entry) => entry.toothNumber)
    ).size,
    restored: new Set(
      active
        .filter((entry) =>
          ['FILLED', 'CROWN', 'ROOT_CANAL', 'IMPLANT', 'BRIDGE'].includes(entry.condition)
        )
        .map((entry) => entry.toothNumber)
    ).size,
  }
}
