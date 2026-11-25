import { format } from '@/lib/money'
import type { Money } from '@/lib/money'
import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: string
  currency?: string
  value?: Money
  locale?: string
  decimals?: number
  symbol?: boolean
  className?: string
}

export function CurrencyDisplay({ amount, currency = 'NGN', value, locale, decimals, symbol, className }: CurrencyDisplayProps) {
  const money = value ?? { amount, currency }
  return <span className={cn('tabular-nums', className)}>{format(money, { locale, decimals, symbol })}</span>
}
