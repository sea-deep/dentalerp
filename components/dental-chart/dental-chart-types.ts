export interface DentalChartEntry {
  id: string
  toothNumber: number
  toothNotation: string
  condition: string
  severity: string
  mesial: boolean
  distal: boolean
  occlusal: boolean
  buccal: boolean
  lingual: boolean
  notes?: string | null
  diagnosedDate: string
  resolvedDate?: string | null
}

export interface DentalChartProps {
  patientId: string
  selectedTeeth?: number[]
  onTeethSelect?: (teeth: number[]) => void
  editable?: boolean
  entries?: DentalChartEntry[]
}

export type DentitionType = 'ADULT' | 'PEDIATRIC' | 'BOTH'
export type NotationSystem = 'FDI' | 'UNIVERSAL'
export type ChartViewMode = 'ARCH' | 'QUADRANTS'

export interface ToothConditionConfig {
  value: string
  label: string
  color: string
  bgClass: string
  textColor: string
  darkBg: string
}
