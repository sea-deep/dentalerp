'use client'

import React, { useId } from 'react'
import { TOOTH_CONDITIONS } from './chart-model'
import { DentalChartEntry, NotationSystem } from './dental-chart-types'
import { formatEnumLabel } from '@/lib/utils'

// FDI to Universal Tooth Numbering Map
export const FDI_TO_UNIVERSAL: Record<number, string> = {
  // Adult Maxilla (18 -> 1 ... 28 -> 16)
  18: '1',
  17: '2',
  16: '3',
  15: '4',
  14: '5',
  13: '6',
  12: '7',
  11: '8',
  21: '9',
  22: '10',
  23: '11',
  24: '12',
  25: '13',
  26: '14',
  27: '15',
  28: '16',
  // Adult Mandible (38 -> 17 ... 48 -> 32)
  38: '17',
  37: '18',
  36: '19',
  35: '20',
  34: '21',
  33: '22',
  32: '23',
  31: '24',
  41: '25',
  42: '26',
  43: '27',
  44: '28',
  45: '29',
  46: '30',
  47: '31',
  48: '32',
  // Pediatric Maxilla (55 -> A ... 65 -> J)
  55: 'A',
  54: 'B',
  53: 'C',
  52: 'D',
  51: 'E',
  61: 'F',
  62: 'G',
  63: 'H',
  64: 'I',
  65: 'J',
  // Pediatric Mandible (75 -> K ... 85 -> T)
  75: 'K',
  74: 'L',
  73: 'M',
  72: 'N',
  71: 'O',
  81: 'P',
  82: 'Q',
  83: 'R',
  84: 'S',
  85: 'T',
}

export const TOOTH_NAMES: Record<number, string> = {
  // Upper Right (Q1)
  18: 'Upper Right 3rd Molar',
  17: 'Upper Right 2nd Molar',
  16: 'Upper Right 1st Molar',
  15: 'Upper Right 2nd Premolar',
  14: 'Upper Right 1st Premolar',
  13: 'Upper Right Canine',
  12: 'Upper Right Lateral Incisor',
  11: 'Upper Right Central Incisor',
  // Upper Left (Q2)
  21: 'Upper Left Central Incisor',
  22: 'Upper Left Lateral Incisor',
  23: 'Upper Left Canine',
  24: 'Upper Left 1st Premolar',
  25: 'Upper Left 2nd Premolar',
  26: 'Upper Left 1st Molar',
  27: 'Upper Left 2nd Molar',
  28: 'Upper Left 3rd Molar',
  // Lower Left (Q3)
  31: 'Lower Left Central Incisor',
  32: 'Lower Left Lateral Incisor',
  33: 'Lower Left Canine',
  34: 'Lower Left 1st Premolar',
  35: 'Lower Left 2nd Premolar',
  36: 'Lower Left 1st Molar',
  37: 'Lower Left 2nd Molar',
  38: 'Lower Left 3rd Molar',
  // Lower Right (Q4)
  41: 'Lower Right Central Incisor',
  42: 'Lower Right Lateral Incisor',
  43: 'Lower Right Canine',
  44: 'Lower Right 1st Premolar',
  45: 'Lower Right 2nd Premolar',
  46: 'Lower Right 1st Molar',
  47: 'Lower Right 2nd Molar',
  48: 'Lower Right 3rd Molar',
  // Pediatric Upper
  55: 'Primary Upper Right 2nd Molar',
  54: 'Primary Upper Right 1st Molar',
  53: 'Primary Upper Right Canine',
  52: 'Primary Upper Right Lateral Incisor',
  51: 'Primary Upper Right Central Incisor',
  61: 'Primary Upper Left Central Incisor',
  62: 'Primary Upper Left Lateral Incisor',
  63: 'Primary Upper Left Canine',
  64: 'Primary Upper Left 1st Molar',
  65: 'Primary Upper Left 2nd Molar',
  // Pediatric Lower
  71: 'Primary Lower Left Central Incisor',
  72: 'Primary Lower Left Lateral Incisor',
  73: 'Primary Lower Left Canine',
  74: 'Primary Lower Left 1st Molar',
  75: 'Primary Lower Left 2nd Molar',
  81: 'Primary Lower Right Central Incisor',
  82: 'Primary Lower Right Lateral Incisor',
  83: 'Primary Lower Right Canine',
  84: 'Primary Lower Right 1st Molar',
  85: 'Primary Lower Right 2nd Molar',
}

export type ToothMorphology =
  'central-incisor' | 'lateral-incisor' | 'canine' | 'premolar' | 'molar'

export function getMorphology(num: number): ToothMorphology {
  const position = num % 10
  const pos = num > 50 && position >= 4 ? 6 : position
  if (pos === 1) return 'central-incisor'
  if (pos === 2) return 'lateral-incisor'
  if (pos === 3) return 'canine'
  if (pos === 4 || pos === 5) return 'premolar'
  return 'molar'
}

export interface AnatomicToothProps {
  toothNumber: number
  notation: NotationSystem
  entry?: DentalChartEntry
  isSelected?: boolean
  onClick: (toothNumber: number) => void
  isUpper: boolean
  compact?: boolean
  tabIndex?: number
  onFocus?: () => void
  findingCount?: number
}

export function AnatomicTooth({
  toothNumber,
  notation,
  entry,
  isSelected,
  onClick,
  isUpper,
  compact = false,
  tabIndex,
  onFocus,
  findingCount = 0,
}: AnatomicToothProps) {
  const id = useId().replace(/:/g, '')
  const morphology = getMorphology(toothNumber)
  const condition = entry?.condition
  const color = TOOTH_CONDITIONS.find((item) => item.value === condition)?.color || '#94a3b8'
  const missing = condition === 'MISSING' || condition === 'EXTRACTION'
  const label = notation === 'UNIVERSAL' ? FDI_TO_UNIVERSAL[toothNumber] : String(toothNumber)
  const crown =
    morphology === 'molar'
      ? 'M8 43 C6 37 6 29 11 26 C16 23 20 27 26 26 C32 24 38 24 42 28 C47 32 46 39 44 44 L42 56 C35 60 17 60 10 56 Z'
      : morphology === 'premolar'
        ? 'M13 43 C10 36 12 27 18 26 C23 24 26 27 29 26 C36 24 41 30 39 40 L37 56 C31 59 21 59 15 56 Z'
        : morphology === 'canine'
          ? 'M15 55 C12 45 13 35 17 31 L26 25 L35 31 C39 36 39 47 36 55 C29 59 22 59 15 55 Z'
          : 'M15 55 L13 34 Q13 27 19 27 L33 27 Q39 27 39 34 L37 55 Q26 59 15 55 Z'
  const roots =
    morphology === 'molar'
      ? isUpper
        ? 'M11 29 C7 20 8 5 13 3 C17 2 19 19 20 28 M22 27 C21 18 23 4 26 3 C30 4 30 18 31 27 M33 28 C34 18 37 2 41 4 C46 9 42 23 42 29'
        : 'M12 29 C7 18 10 4 15 3 C19 5 19 20 22 28 M30 28 C32 18 34 2 39 4 C44 10 41 23 40 29'
      : 'M18 29 C17 17 21 2 25 2 C29 2 32 19 33 29'
  const surfaceColor = (active: boolean | undefined) => (active ? color : '#f8fafc')
  const mesialOnLeft = [2, 3, 6, 7].includes(Math.floor(toothNumber / 10))
  return (
    <button
      type="button"
      data-tooth={toothNumber}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={() => onClick(toothNumber)}
      aria-pressed={!!isSelected}
      aria-label={`Tooth ${label} (${TOOTH_NAMES[toothNumber]}), ${condition ? formatEnumLabel(condition) : 'not charted'}${findingCount > 1 ? `, ${findingCount} active entries` : ''}`}
      title={`${TOOTH_NAMES[toothNumber]} · ${condition ? formatEnumLabel(condition) : 'Not charted'}`}
      className={`relative flex min-h-[112px] min-w-[40px] flex-1 flex-col items-center rounded-md border px-0.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted'}`}
    >
      <span className={`text-xs tabular-nums ${isSelected ? 'font-bold' : 'font-medium'}`}>
        {label}
      </span>
      <svg
        aria-hidden="true"
        width={compact ? 30 : 36}
        height={64}
        viewBox="0 0 52 66"
        className="my-1 overflow-visible"
      >
        <defs>
          <clipPath id={`crown-${id}`}>
            <path d={crown} />
          </clipPath>
        </defs>
        <g transform={isUpper ? undefined : 'translate(0 62) scale(1 -1)'}>
          <g opacity={missing ? 0.25 : 1}>
            <path
              d={roots}
              fill={condition === 'ROOT_CANAL' ? '#ede9fe' : '#f1f5f9'}
              stroke={condition === 'ROOT_CANAL' ? color : '#94a3b8'}
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path
              d={crown}
              fill={condition === 'CROWN' || condition === 'BRIDGE' ? '#fef3c7' : '#fff'}
              stroke={condition ? color : '#94a3b8'}
              strokeWidth="1.4"
            />
            <g
              clipPath={`url(#crown-${id})`}
              opacity={condition === 'CROWN' || condition === 'BRIDGE' ? 0.35 : 1}
            >
              <path
                d="M10 30 L18 37 L34 37 L42 30 Z"
                fill={surfaceColor(entry?.buccal)}
                stroke="#cbd5e1"
                strokeWidth="0.8"
              />
              <path
                d="M10 53 L18 47 L34 47 L42 53 Z"
                fill={surfaceColor(entry?.lingual)}
                stroke="#cbd5e1"
                strokeWidth="0.8"
              />
              <path
                d="M9 31 L18 37 L18 47 L10 55 Z"
                fill={surfaceColor(mesialOnLeft ? entry?.mesial : entry?.distal)}
                stroke="#cbd5e1"
                strokeWidth="0.8"
              />
              <path
                d="M42 31 L34 37 L34 47 L42 55 Z"
                fill={surfaceColor(mesialOnLeft ? entry?.distal : entry?.mesial)}
                stroke="#cbd5e1"
                strokeWidth="0.8"
              />
              <rect
                x="18"
                y="37"
                width="16"
                height="10"
                rx="2"
                fill={surfaceColor(entry?.occlusal)}
                stroke="#cbd5e1"
                strokeWidth="0.8"
              />
            </g>
            {condition === 'IMPLANT' && (
              <path
                d="M23 5 L29 5 L29 25 L23 25 Z M20 10 L32 10 M20 16 L32 16 M20 22 L32 22"
                stroke={color}
                strokeWidth="1.8"
              />
            )}
          </g>
          {missing && (
            <path
              d="M11 29 L42 56 M42 29 L11 56"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
          {condition === 'FRACTURED' && (
            <path d="M28 27 L22 38 L29 43 L23 57" stroke={color} strokeWidth="2" fill="none" />
          )}
        </g>
      </svg>
      <span className="flex h-2 items-center gap-0.5" aria-hidden="true">
        {condition ? (
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        ) : (
          <span className="h-1 w-1 rounded-full bg-border" />
        )}
        {findingCount > 1 && <span className="text-[9px]">+{findingCount - 1}</span>}
      </span>
    </button>
  )
}
