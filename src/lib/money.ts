import Decimal from 'decimal.js'

export interface Money {
  /** Full precision, decimal string. Never a float. */
  amount: string
  currency: string
}

export type RoundingMode = 'half-up' | 'half-down' | 'ceil' | 'floor'

export interface MoneyConfig {
  rounding: RoundingMode
  decimalsByCurrency: Record<string, number>
}

let config: MoneyConfig = {
  rounding: 'half-up',
  decimalsByCurrency: { NGN: 2, USD: 2, EUR: 2, GBP: 2, JPY: 0, KWD: 3 },
}

export function getMoneyConfig(): MoneyConfig {
  return { ...config, decimalsByCurrency: { ...config.decimalsByCurrency } }
}

export function setMoneyConfig(next: Partial<MoneyConfig>): void {
  config = {
    rounding: next.rounding ?? config.rounding,
    decimalsByCurrency: { ...config.decimalsByCurrency, ...(next.decimalsByCurrency ?? {}) },
  }
}

function decimalMode(): Decimal.Rounding {
  return config.rounding === 'half-down' ? Decimal.ROUND_HALF_DOWN
    : config.rounding === 'ceil' ? Decimal.ROUND_CEIL
      : config.rounding === 'floor' ? Decimal.ROUND_FLOOR
        : Decimal.ROUND_HALF_UP
}

export function decimalsFor(currency: string): number {
  return config.decimalsByCurrency[currency.toUpperCase()] ?? 2
}

export function decimal(value: Money | string | Decimal): Decimal {
  return value instanceof Decimal ? value : new Decimal(typeof value === 'string' ? value : value.amount)
}

export function money(amount: string | Decimal | number, currency: string): Money {
  return { amount: decimal(String(amount)).toString(), currency: currency.toUpperCase() }
}

export function zero(currency: string): Money {
  return money('0', currency)
}

function sameCurrency(a: Money, b: Money): void {
  if (a.currency.toUpperCase() !== b.currency.toUpperCase()) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`)
  }
}

export function add(a: Money, b: Money): Money {
  sameCurrency(a, b)
  return money(decimal(a).plus(decimal(b)), a.currency)
}

export function subtract(a: Money, b: Money): Money {
  sameCurrency(a, b)
  return money(decimal(a).minus(decimal(b)), a.currency)
}

export function multiply(value: Money, factor: string | Decimal): Money {
  return money(decimal(value).times(decimal(factor)), value.currency)
}

export function divide(value: Money, divisor: string | Decimal): Money {
  const d = decimal(divisor)
  if (d.isZero()) throw new Error('Division by zero')
  return money(decimal(value).div(d), value.currency)
}

export function sum(values: Money[], currency?: string): Money {
  if (!values.length) return zero(currency ?? 'NGN')
  const target = currency ?? values[0].currency
  return values.reduce((total, value) => add(total, value), zero(target))
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  sameCurrency(a, b)
  const difference = decimal(a).comparedTo(decimal(b))
  return difference < 0 ? -1 : difference > 0 ? 1 : 0
}

export const greaterThan = (a: Money, b: Money) => compare(a, b) > 0
export const lessThan = (a: Money, b: Money) => compare(a, b) < 0
export const equals = (a: Money, b: Money) => compare(a, b) === 0
export const isZero = (value: Money) => decimal(value).isZero()
export const isNegative = (value: Money) => decimal(value).isNegative()
export const absolute = (value: Money) => money(decimal(value).abs(), value.currency)
export const negate = (value: Money) => money(decimal(value).negated(), value.currency)

/** Rounds for display only; stored values keep full precision. */
export function round(value: Money, decimals = decimalsFor(value.currency)): Money {
  return money(decimal(value).toDecimalPlaces(decimals, decimalMode()), value.currency)
}

/** Intl.NumberFormat-backed formatting, respecting locale and company currency. */
export function format(value: Money, options: { locale?: string; decimals?: number; symbol?: boolean } = {}): string {
  const decimals = options.decimals ?? decimalsFor(value.currency)
  const rounded = decimal(value).toDecimalPlaces(decimals, decimalMode()).toNumber()
  return new Intl.NumberFormat(options.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-NG'), {
    style: options.symbol === false ? 'decimal' : 'currency',
    currency: value.currency.toUpperCase(),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded)
}

/** Strip grouping separators and surrounding whitespace from user input. */
export function parse(input: string, currency: string): Money {
  const cleaned = input.replace(/[\s,\u00a0]/g, '')
  if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '-' || cleaned === '.') {
    throw new Error(`Invalid money value: ${input}`)
  }
  return money(cleaned, currency)
}
