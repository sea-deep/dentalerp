'use client'
import { useId, useState } from 'react'
export function BeforeAfter({
  before,
  after,
  title,
}: {
  before: string
  after: string
  title: string
}) {
  const [position, setPosition] = useState(50),
    id = useId()
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={after}
          alt={`${title}, after treatment`}
          className="absolute h-full w-full object-cover"
        />
        <img
          src={before}
          alt={`${title}, before treatment`}
          className="absolute h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <span className="absolute left-3 top-3 bg-background px-2 py-1 text-sm">Before</span>
        <span className="absolute right-3 top-3 bg-background px-2 py-1 text-sm">After</span>
      </div>
      <label htmlFor={id} className="block text-sm">
        Compare before and after
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}
