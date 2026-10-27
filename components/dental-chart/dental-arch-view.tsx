'use client'

import { useState } from 'react'
import { AnatomicTooth } from './anatomic-tooth'
import type { DentalChartEntry, DentitionType, NotationSystem } from './dental-chart-types'

interface DentalArchViewProps {
  dentition: DentitionType
  notation: NotationSystem
  chartData: Record<number, DentalChartEntry[]>
  selectedTeeth: number[]
  onToothClick: (toothNumber: number) => void
}

export const ADULT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
export const ADULT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28]
export const ADULT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38]
export const ADULT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]
export const PED_UPPER_RIGHT = [55, 54, 53, 52, 51]
export const PED_UPPER_LEFT = [61, 62, 63, 64, 65]
export const PED_LOWER_LEFT = [71, 72, 73, 74, 75]
export const PED_LOWER_RIGHT = [85, 84, 83, 82, 81]

export function DentalArchView({
  dentition,
  notation,
  chartData,
  selectedTeeth,
  onToothClick,
}: DentalArchViewProps) {
  const [focused, setFocused] = useState<number | null>(null)
  const rows = [
    ...(dentition !== 'PEDIATRIC'
      ? [
          {
            label: 'Upper · permanent',
            right: ADULT_UPPER_RIGHT,
            left: ADULT_UPPER_LEFT,
            upper: true,
          },
        ]
      : []),
    ...(dentition !== 'ADULT'
      ? [
          { label: 'Upper · primary', right: PED_UPPER_RIGHT, left: PED_UPPER_LEFT, upper: true },
          { label: 'Lower · primary', right: PED_LOWER_RIGHT, left: PED_LOWER_LEFT, upper: false },
        ]
      : []),
    ...(dentition !== 'PEDIATRIC'
      ? [
          {
            label: 'Lower · permanent',
            right: ADULT_LOWER_RIGHT,
            left: ADULT_LOWER_LEFT,
            upper: false,
          },
        ]
      : []),
  ]
  const visible = rows.flatMap((row) => [...row.right, ...row.left])
  const tabStop = focused && visible.includes(focused) ? focused : visible[0]
  return (
    <div className="min-w-0" aria-label="Dental odontogram">
      <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
        <span>Patient’s right</span>
        <span className="font-medium">Frontal view</span>
        <span>Patient’s left</span>
      </div>
      <div
        className="overflow-x-auto pb-2"
        role="group"
        aria-label="Teeth. Use arrow keys to move; Enter or Space to select."
        onKeyDown={(event) => {
          if (!(event.target instanceof HTMLButtonElement) || !event.target.dataset.tooth) return
          const rowIndex = rows.findIndex((row) =>
            [...row.right, ...row.left].includes(
              Number(event.target instanceof HTMLElement ? event.target.dataset.tooth : 0)
            )
          )
          const rowTeeth = [...rows[rowIndex].right, ...rows[rowIndex].left]
          const column = rowTeeth.indexOf(Number(event.target.dataset.tooth))
          let next: number | undefined
          if (event.key === 'ArrowRight') next = rowTeeth[Math.min(column + 1, rowTeeth.length - 1)]
          if (event.key === 'ArrowLeft') next = rowTeeth[Math.max(column - 1, 0)]
          if (event.key === 'Home') next = rowTeeth[0]
          if (event.key === 'End') next = rowTeeth[rowTeeth.length - 1]
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            const nextRow = rows[rowIndex + (event.key === 'ArrowUp' ? -1 : 1)]
            if (nextRow) {
              const numbers = [...nextRow.right, ...nextRow.left]
              next = numbers[Math.min(column, numbers.length - 1)]
            }
          }
          if (next !== undefined) {
            event.preventDefault()
            event.currentTarget.querySelector<HTMLButtonElement>(`[data-tooth="${next}"]`)?.focus()
          }
        }}
      >
        <div className={dentition === 'PEDIATRIC' ? 'min-w-[440px]' : 'min-w-[672px]'}>
          {rows.map((row, index) => (
            <div key={row.label} className={index > 0 ? 'mt-3 border-t border-dashed pt-4' : ''}>
              <div className="mb-2 text-center text-[11px] font-medium text-muted-foreground">
                {row.label}
              </div>
              <div className="grid grid-cols-2 divide-x">
                {[row.right, row.left].map((numbers, side) => (
                  <div key={side} className={`flex gap-0.5 ${side === 0 ? 'pr-2' : 'pl-2'}`}>
                    {numbers.map((number) => {
                      const active = chartData[number]?.filter((entry) => !entry.resolvedDate) || []
                      return (
                        <AnatomicTooth
                          key={number}
                          toothNumber={number}
                          notation={notation}
                          entry={active[0]}
                          findingCount={active.length}
                          isSelected={selectedTeeth.includes(number)}
                          isUpper={row.upper}
                          onClick={onToothClick}
                          tabIndex={number === tabStop ? 0 : -1}
                          onFocus={() => setFocused(number)}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Arrow keys move between teeth. Enter selects. Tab moves to finding details. Scroll
        horizontally on smaller screens.
      </p>
    </div>
  )
}
