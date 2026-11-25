import { FieldError, Label } from '@/components/ui/input'
import { format, parse } from '@/lib/money'
import { cn } from '@/lib/utils'

interface MoneyInputProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  currency?: string
  onCurrencyChange?: (currency: string) => void
  currencies?: string[]
  error?: string
  disabled?: boolean
  placeholder?: string
}

/** String-backed money field with decimal keypad, currency mask and full precision. */
export function MoneyInput({ id, label, value, onChange, currency = 'NGN', onCurrencyChange, currencies = ['NGN', 'USD', 'EUR', 'GBP'], error, disabled, placeholder = '0.00' }: MoneyInputProps) {
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className={cn('flex rounded-lg border border-input bg-background shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/35', error && 'border-destructive')}>
        <input
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value
            if (/^-?\d*\.?\d*$/.test(next)) onChange(next)
          }}
          onBlur={() => {
            try {
              const parsed = parse(value, currency)
              if (parsed.amount !== value) onChange(parsed.amount)
            } catch { /* keep raw input so validation can report it */ }
          }}
          inputMode="decimal"
          autoComplete="off"
          aria-label={label ?? 'Amount'}
          aria-invalid={Boolean(error)}
          placeholder={placeholder}
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums outline-none disabled:opacity-50"
        />
        {onCurrencyChange ? (
          <select
            aria-label="Currency"
            value={currency}
            disabled={disabled}
            onChange={(event) => onCurrencyChange(event.target.value)}
            className="h-10 rounded-r-lg border-l border-input bg-muted/50 px-2 text-xs font-bold outline-none"
          >
            {currencies.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        ) : (
          <span className="flex h-10 items-center rounded-r-lg border-l border-input bg-muted/50 px-3 text-xs font-bold">{currency}</span>
        )}
      </div>
      {error ? <FieldError>{error}</FieldError> : (
        <p className="text-[10px] text-muted-foreground">
          Preview: {format({ amount: value || '0', currency }, { locale: undefined })}
        </p>
      )}
    </div>
  )
}
