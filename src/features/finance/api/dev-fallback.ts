import { financeHandlers } from '@/features/finance/mocks/handlers'
import { seedAccounts, seedAuditEvents, seedCustomers, seedInvoices, seedPayments, seedPeriods, seedTaxRates } from '@/features/finance/mocks/seed'
import { add, compare, divide, money, multiply, subtract, sum } from '@/lib/money'
import type { Account, AuditEvent, Customer, FinanceInvoice, FinancePayment, TaxRate } from '@/types/domain'

export interface DevResponse {
  status: number
  body: Record<string, unknown>
}

let accounts: Account[] = seedAccounts.map((item) => ({ ...item }))
let customers: Customer[] = seedCustomers.map((item) => ({ ...item }))
let invoices: FinanceInvoice[] = seedInvoices.map((item) => ({ ...item, lines: item.lines.map((line) => ({ ...line })) }))
let payments: FinancePayment[] = seedPayments.map((item) => ({ ...item }))
let audit: AuditEvent[] = seedAuditEvents.map((item) => ({ ...item }))
const taxRates: TaxRate[] = seedTaxRates

// Keep the MSW handlers bundled so the dev fallback and tests share the same seed contract.
void financeHandlers

const ok = <T>(data: T, status = 200): DevResponse => ({ status, body: { data: data as unknown as Record<string, unknown> } })
const fail = (code: string, message: string, status: number, fieldErrors?: Record<string, string>): DevResponse => ({ status, body: { code, message, fieldErrors } })
const payload = (init: RequestInit) => {
  try { return JSON.parse(String(init.body ?? '{}')) as Record<string, any> } catch { return {} as Record<string, any> }
}
const amountDue = (invoice: FinanceInvoice) => subtract(money(invoice.total, invoice.currency), money(invoice.amountPaid, invoice.currency))
const effectiveStatus = (invoice: FinanceInvoice): FinanceInvoice['status'] => {
  if (invoice.status === 'VOID' || invoice.status === 'DRAFT') return invoice.status
  if (compare(money(invoice.amountPaid, invoice.currency), money(invoice.total, invoice.currency)) >= 0) return 'PAID'
  if (compare(money(invoice.amountPaid, invoice.currency), money('0', invoice.currency)) > 0) return 'PARTIALLY_PAID'
  if (Date.parse(invoice.dueDate) < Date.now()) return 'OVERDUE'
  return invoice.status
}
const withStatus = (invoice: FinanceInvoice): FinanceInvoice => ({ ...invoice, status: effectiveStatus(invoice) })
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
const nextNumber = () => `INV-2026-${String(invoices.reduce((max, item) => Math.max(max, Number(item.number.split('-').pop()) || 0), 0) + 1).padStart(3, '0')}`

function lineTax(line: { unitPrice: string; quantity: string; taxRateId?: string }, currency: string) {
  const rate = taxRates.find((candidate) => candidate.id === line.taxRateId)
  if (!rate) return money('0', currency)
  return multiply(multiply(money(line.unitPrice, currency), line.quantity), divide(money(rate.rate, currency), '100').amount)
}
function totalsFor(lines: Array<{ unitPrice: string; quantity: string; taxRateId?: string }>, discount: string, currency: string) {
  const subtotal = sum(lines.map((line) => multiply(money(line.unitPrice, currency), line.quantity)), currency)
  const tax = sum(lines.map((line) => lineTax(line, currency)), currency)
  return { subtotal, tax, total: add(subtract(subtotal, money(discount || '0', currency)), tax) }
}
function log(entry: Pick<AuditEvent, 'action' | 'entity' | 'entityId' | 'reason' | 'before' | 'after'>) {
  audit = [{ id: nextId('audit'), actor: 'Demo user', timestamp: new Date().toISOString(), ip: '127.0.0.1', ...entry }, ...audit]
}

/** Browser-side stand-in for /api/finance/* during development (no service worker required). */
export function devRequest(path: string, init: RequestInit = {}): DevResponse {
  const method = (init.method ?? 'GET').toUpperCase()
  const body = payload(init)
  const segments = path.split('?')[0].split('/').filter(Boolean)

  if (segments[0] === 'meta') {
    const receivables = invoices.reduce((total, invoice) => {
      const status = effectiveStatus(invoice)
      return status === 'DRAFT' || status === 'VOID' || status === 'PAID' ? total : add(total, amountDue(invoice))
    }, money('0', 'NGN'))
    const overdue = invoices.reduce((total, invoice) => effectiveStatus(invoice) === 'OVERDUE' ? add(total, amountDue(invoice)) : total, money('0', 'NGN'))
    const statuses = invoices.map(effectiveStatus)
    return ok({
      totalAccounts: accounts.length, activeAccounts: accounts.filter((item) => item.status === 'active').length,
      archivedAccounts: accounts.filter((item) => item.status === 'archived').length,
      postedLines: accounts.reduce((total, item) => total + item.postedEntryCount, 0),
      totalInvoices: invoices.length, draftInvoices: statuses.filter((item) => item === 'DRAFT').length,
      overdueInvoices: statuses.filter((item) => item === 'OVERDUE').length,
      paidInvoices: statuses.filter((item) => item === 'PAID').length,
      receivables: receivables.amount, overdueAmount: overdue.amount, nextInvoiceNumber: nextNumber(), periods: seedPeriods,
    })
  }
  if (segments[0] === 'periods') return ok(seedPeriods)
  if (segments[0] === 'tax-rates') return ok(taxRates)
  if (segments[0] === 'audit') {
    if (method === 'POST') { log(body as Pick<AuditEvent, 'action' | 'entity' | 'entityId' | 'reason' | 'before' | 'after'>); return ok({ ok: true }, 201) }
    return ok(audit)
  }
  if (segments[0] === 'customers') {
    if (method === 'POST') {
      if (!body.name || !body.email) return fail('VALIDATION_ERROR', 'Name and email are required', 422)
      if (customers.some((item) => item.email.toLowerCase() === String(body.email).toLowerCase())) return fail('DUPLICATE_EMAIL', 'Email already exists', 409, { email: 'Must be unique' })
      const customer: Customer = { id: nextId('cus'), ...(body as Customer), createdAt: new Date().toISOString() }
      customers = [customer, ...customers]
      log({ action: 'create', entity: 'Customer', entityId: customer.id, after: customer as unknown as Record<string, unknown> })
      return ok(customer, 201)
    }
    return ok(customers)
  }
  if (segments[0] === 'accounts') {
    if (segments[1]) {
      const account = accounts.find((item) => item.id === segments[1])
      if (!account) return fail('NOT_FOUND', 'Account not found', 404)
      if (method === 'GET') return ok(account)
      if (method === 'DELETE') {
        if (account.postedEntryCount > 0) return fail('ACCOUNT_HAS_POSTINGS', 'This account has posted entries. Archive it instead.', 409)
        accounts = accounts.filter((item) => item.id !== account.id)
        log({ action: 'delete', entity: 'Account', entityId: account.id, reason: String(body.reason ?? ''), before: account as unknown as Record<string, unknown> })
        return ok({ id: account.id })
      }
      if (method === 'PUT') {
        const updated: Account = { ...account, ...body, id: account.id, updatedAt: new Date().toISOString() }
        accounts = accounts.map((item) => item.id === account.id ? updated : item)
        log({ action: 'update', entity: 'Account', entityId: account.id, before: account as unknown as Record<string, unknown>, after: updated as unknown as Record<string, unknown> })
        return ok(updated)
      }
    }
    if (method === 'POST') {
      if (!body.code || !body.name) return fail('VALIDATION_ERROR', 'Code and name are required', 422)
      if (accounts.some((item) => item.code.toLowerCase() === String(body.code).toLowerCase())) return fail('DUPLICATE_CODE', 'Code must be unique', 409, { code: 'Already in use' })
      const now = new Date().toISOString()
      const account: Account = { id: nextId('acc'), ...(body as Account), code: String(body.code).toUpperCase(), postedEntryCount: 0, createdAt: now, updatedAt: now }
      accounts = [account, ...accounts]
      log({ action: 'create', entity: 'Account', entityId: account.id, after: account as unknown as Record<string, unknown> })
      return ok(account, 201)
    }
    return ok(accounts)
  }
  if (segments[0] === 'invoices') {
    if (segments[2] === 'send') {
      const invoice = invoices.find((item) => item.id === segments[1])
      if (!invoice) return fail('NOT_FOUND', 'Invoice not found', 404)
      const updated = { ...invoice, status: 'SENT' as const, updatedAt: new Date().toISOString() }
      invoices = invoices.map((item) => item.id === invoice.id ? updated : item)
      log({ action: 'update', entity: 'Invoice', entityId: invoice.id, after: { status: 'SENT' } })
      return ok(withStatus(updated))
    }
    if (segments[1]) {
      const invoice = invoices.find((item) => item.id === segments[1])
      if (!invoice) return fail('NOT_FOUND', 'Invoice not found', 404)
      if (method === 'PUT') {
        const lines = (body.lines ?? invoice.lines).map((line: any) => ({ ...line, id: line.id || nextId('line') }))
        const totals = totalsFor(lines, body.discount, body.currency)
        const updated: FinanceInvoice = { ...invoice, ...body, lines, ...Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value.amount])), updatedAt: new Date().toISOString() }
        invoices = invoices.map((item) => item.id === invoice.id ? updated : item)
        return ok(withStatus(updated))
      }
      if (method === 'DELETE') {
        invoices = invoices.filter((item) => item.id !== invoice.id)
        log({ action: 'delete', entity: 'Invoice', entityId: invoice.id, reason: String(body.reason ?? '') })
        return ok({ id: invoice.id })
      }
      return ok(withStatus(invoice))
    }
    if (method === 'POST') {
      const customer = customers.find((item) => item.id === body.customerId)
      if (!customer) return fail('CUSTOMER_NOT_FOUND', 'Select a customer', 422, { customerId: 'Required' })
      if (Date.parse(body.dueDate) < Date.parse(body.issueDate)) return fail('INVALID_DUE_DATE', 'Due date must follow issue date', 422, { dueDate: 'Choose a later date' })
      const currency = String(body.currency ?? 'NGN').toUpperCase()
      const lines = (body.lines ?? []).map((line: any) => ({ ...line, id: nextId('line') }))
      const totals = totalsFor(lines, body.discount, currency)
      const now = new Date().toISOString()
      const invoice: FinanceInvoice = {
        id: nextId('inv'), number: nextNumber(), customerId: customer.id, customerName: customer.name,
        lines, subtotal: totals.subtotal.amount, discount: money(body.discount || '0', currency).amount,
        tax: totals.tax.amount, total: totals.total.amount, amountPaid: '0', currency,
        issueDate: body.issueDate, dueDate: body.dueDate, status: 'DRAFT', notes: body.notes, createdAt: now, updatedAt: now,
      }
      invoices = [invoice, ...invoices]
      log({ action: 'create', entity: 'Invoice', entityId: invoice.id, after: invoice as unknown as Record<string, unknown> })
      return ok(withStatus(invoice), 201)
    }
    return ok(invoices.map(withStatus))
  }
  if (segments[0] === 'payments') {
    if (method === 'POST') {
      if (payments.some((item) => item.idempotencyKey === body.idempotencyKey)) return fail('DUPLICATE_IDEMPOTENCY_KEY', 'Payment already processed', 409, { idempotencyKey: 'Already used' })
      const currency = String(body.currency ?? 'NGN').toUpperCase()
      const allocated = sum((body.allocations ?? []).map((entry: any) => money(entry.amount, currency)), currency)
      if (compare(allocated, money(body.amount, currency)) !== 0) return fail('ALLOCATION_MISMATCH', 'Allocations must equal payment amount', 422, { allocations: 'Total mismatch' })
      for (const entry of body.allocations ?? []) {
        const invoice = invoices.find((item) => item.id === entry.documentId)
        if (!invoice) return fail('DOCUMENT_NOT_FOUND', 'Invoice not found', 422)
        if (compare(add(money(invoice.amountPaid, invoice.currency), money(entry.amount, invoice.currency)), money(invoice.total, invoice.currency)) > 0) return fail('OVERPAYMENT', `${invoice.number} cannot be overpaid`, 409)
      }
      const payment: FinancePayment = { id: nextId('pay'), number: `PAY-2026-${String(payments.length + 1).padStart(3, '0')}`, ...(body as FinancePayment), currency, createdAt: new Date().toISOString() }
      payments = [payment, ...payments]
      for (const entry of body.allocations ?? []) {
        invoices = invoices.map((invoice) => invoice.id === entry.documentId ? { ...invoice, amountPaid: add(money(invoice.amountPaid, invoice.currency), money(entry.amount, invoice.currency)).amount, updatedAt: new Date().toISOString() } : invoice)
      }
      log({ action: 'create', entity: 'Payment', entityId: payment.id, after: payment as unknown as Record<string, unknown> })
      return ok(payment, 201)
    }
    return ok(payments)
  }
  if (segments[0] === 'ar-aging') {
    const day = 86_400_000
    const rows = invoices.filter((item) => !['DRAFT', 'VOID', 'PAID'].includes(effectiveStatus(item)) && compare(amountDue(item), money('0', item.currency)) > 0).map((invoice) => {
      const days = Math.max(0, Math.floor((Date.now() - Date.parse(invoice.dueDate)) / day))
      return { id: invoice.id, number: invoice.number, customerName: invoice.customerName, dueDate: invoice.dueDate, amountDue: amountDue(invoice).amount, currency: invoice.currency, bucket: days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+' }
    })
    const totals: Record<string, string> = { '0-30': '0', '31-60': '0', '61-90': '0', '90+': '0' }
    for (const row of rows) totals[row.bucket] = add(money(totals[row.bucket], row.currency), money(row.amountDue, row.currency)).amount
    return ok({ rows, totals, total: sum(Object.values(totals).map((value) => money(value, 'NGN')), 'NGN').amount })
  }
  return fail('NOT_FOUND', `No mock handler for ${method} ${path}`, 404)
}
