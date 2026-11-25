import { afterEach, describe, expect, it } from 'vitest'
import { add, compare, decimalsFor, format, getMoneyConfig, isZero, money, multiply, round, setMoneyConfig, subtract, sum } from './money'

const defaultRounding = getMoneyConfig().rounding
afterEach(() => setMoneyConfig({ rounding: defaultRounding }))

describe('Money helpers', () => {
  it('keeps full precision with decimal strings', () => {
    expect(add(money('0.1', 'NGN'), money('0.2', 'NGN')).amount).toBe('0.3')
    expect(subtract(money('1', 'USD'), money('0.005', 'USD')).amount).toBe('0.995')
  })

  it('compares and sums', () => {
    expect(compare(money('10', 'NGN'), money('9.999', 'NGN'))).toBe(1)
    expect(isZero(sum([money('2', 'NGN'), money('-2', 'NGN')], 'NGN'))).toBe(true)
    expect(multiply(money('19.99', 'NGN'), '3').amount).toBe('59.97')
  })

  it('rejects cross-currency arithmetic', () => {
    expect(() => add(money('1', 'NGN'), money('1', 'USD'))).toThrow(/Currency mismatch/)
    expect(() => compare(money('1', 'NGN'), money('1', 'USD'))).toThrow(/Currency mismatch/)
  })

  it('rounds half-up by default and honours per-currency decimals', () => {
    expect(round(money('1.005', 'USD')).amount).toBe('1.01')
    expect(decimalsFor('JPY')).toBe(0)
    expect(round(money('1.5', 'JPY')).amount).toBe('2')
    setMoneyConfig({ rounding: 'half-down' })
    expect(round(money('1.005', 'USD')).amount).toBe('1')
  })

  it('formats with Intl and full precision retained underneath', () => {
    const value = money('1234.567', 'NGN')
    expect(format(value, { locale: 'en-NG' })).toContain('1,234.57')
    expect(value.amount).toBe('1234.567')
  })
})
