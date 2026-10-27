'use client'
import { useResource } from '@/components/operations/resource'
import { Button } from '@/components/ui/button'
export function ReferencePicks({
  kind,
  onPick,
}: {
  kind: string
  onPick: (value: string) => void
}) {
  const { data, error } = useResource<{
    references: { id: string; kind: string; label: string }[]
  }>('/api/clinical-references')
  if (error || !data) return null
  return (
    <div className="flex flex-wrap gap-2" aria-label={`Saved ${kind.toLowerCase()} choices`}>
      {data.references
        .filter((r) => r.kind === kind)
        .map((r) => (
          <Button
            key={r.id}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPick(r.label)}
          >
            {r.label}
          </Button>
        ))}
    </div>
  )
}
