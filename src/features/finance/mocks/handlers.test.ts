import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { financeHandlers } from './handlers'

const server = setupServer(...financeHandlers)
beforeAll(() => server.listen())
afterAll(() => server.close())

async function call(path: string, init?: RequestInit) {
  const response = await fetch(`http://localhost${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-finance-user': 'Tobias Reed', ...(init?.headers ?? {}) },
  })
  return { status: response.status, body: await response.json() as Record<string, unknown> }
}

describe('finance MSW handlers', () => {
  it('serves accounting metrics and the next invoice number', async () => {
    const response = await call('/api/finance/meta')
    const data = response.body.data as Record<string, unknown>
    expect(response.status).toBe(200)
    expect(data.nextInvoiceNumber).toMatch(/^INV-2026-\d{3}$/)
    expect(Number(data.receivables)).toBeGreaterThan(0)
  })

  it('creates an invoice with decimal-precise totals and a unique number', async () => {
    const response = await call('/api/finance/invoices', {
      method: 'POST',
      body: JSON.stringify({
        number: 'INV-2026-900', customerId: 'cus-001', currency: 'NGN',
        lines: [{ description: 'Consulting', quantity: '2', unitPrice: '100.50', taxRateId: 'tax-vat' }],
        discount: '10', issueDate: '2026-11-20T00:00:00.000Z', dueDate: '2026-12-20T00:00:00.000Z', notes: '',
      }),
    })
    expect(response.status).toBe(201)
    const invoice = response.body.data as Record<string, unknown>
    expect(invoice.subtotal).toBe('201')
    expect(invoice.tax).toBe('15.075')
    expect(invoice.total).toBe('206.075')
    expect(invoice.status).toBe('DRAFT')
  })

  it('rejects overpayment and duplicate idempotency keys', async () => {
    const input = {
      direction: 'incoming', amount: '999999', currency: 'NGN', date: '2026-11-20T00:00:00.000Z',
      method: 'Cash', reference: 'TEST-1', idempotencyKey: 'test-key-overpay-001',
      allocations: [{ documentId: 'inv-001', documentType: 'invoice', amount: '999999' }],
    }
    const overpayment = await call('/api/finance/payments', { method: 'POST', body: JSON.stringify(input) })
    expect(overpayment.status).toBe(409)
    expect((overpayment.body as { code: string }).code).toBe('OVERPAYMENT')
  })

  it('derives AR aging buckets from open invoices', async () => {
    const response = await call('/api/finance/ar-aging')
    const data = response.body.data as { rows: Array<{ bucket: string }>; totals: Record<string, string> }
    expect(response.status).toBe(200)
    expect(data.rows.length).toBeGreaterThan(0)
    expect(Object.keys(data.totals)).toEqual(['0-30', '31-60', '61-90', '90+'])
  })
})
