import { Label } from '@/components/ui/input'

interface DateRange {
  from: string
  to: string
}

/** Dates are kept as UTC ISO strings; inputs display the YYYY-MM-DD slice only. */
export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="date-from">From</Label>
        <input
          id="date-from"
          type="date"
          value={value.from.slice(0, 10)}
          onChange={(event) => onChange({ ...value, from: event.target.value ? `${event.target.value}T00:00:00.000Z` : '' })}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date-to">To</Label>
        <input
          id="date-to"
          type="date"
          value={value.to.slice(0, 10)}
          onChange={(event) => onChange({ ...value, to: event.target.value ? `${event.target.value}T23:59:59.000Z` : '' })}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        />
      </div>
    </div>
  )
}
