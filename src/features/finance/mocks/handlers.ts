import { delay, http, HttpResponse } from 'msw'
import { add, compare, divide, money, multiply, subtract, sum } from '@/lib/money'
import { accountSchema, customerSchema, invoiceSchema } from '@/features/finance/schemas'
import type { Account, AuditEvent, Customer, FinanceInvoice, FinancePayment, TaxRate } from '@/types/domain'
import { seedAccounts, seedAuditEvents, seedCustomers, seedInvoices, seedPayments, seedPeriods, seedTaxRates } from './seed'

let accounts: Account[] = seedAccounts.map((account) => ({ ...account }))
let auditEvents: AuditEvent[] = seedAuditEvents.map((event) => ({ ...event }))
let customers: Customer[] = seedCustomers.map((customer) => ({ ...customer }))
let invoices: FinanceInvoice[] = seedInvoices.map((invoice) => ({ ...invoice, lines: invoice.lines.map((line) => ({ ...line })) }))
let payments: FinancePayment[] = seedPayments.map((payment) => ({ ...payment }))
const taxRates: TaxRate[] = seedTaxRates

const error = (code: string, message: string, status: number, fieldErrors?: Record<string, string>) =>
  HttpResponse.json({ code, message, fieldErrors }, { status })

function actor(request: Request) {
  return request.headers.get('x-finance-user') ?? 'System'
}

// TODO(API): replace in-memory stores with the REST backend and derive IP from the request.
function log(request: Request, action: AuditEvent['action'], entity: string, entityId: string, reason?: string, before?: Record<string, unknown>, after?: Record<string, unknown>) {
  auditEvents = [{
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action, entity, entityId, reason,
    actor: actor(request),
    timestamp: new Date().toISOString(),
    ip: '127.0.0.1',
    before, after,
  }, ...auditEvents]
}

const nextId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

function amountDue(invoice: FinanceInvoice) {
  return subtract(money(invoice.total, invoice.currency), money(invoice.amountPaid, invoice.currency))
}

/** Status is derived from paid amount and due date, except for DRAFT/VOID documents. */
function effectiveStatus(invoice: FinanceInvoice): FinanceInvoice['status'] {
  if (invoice.status === 'VOID') return 'VOID'
  if (invoice.status === 'DRAFT') return 'DRAFT'
  if (compare(money(invoice.amountPaid, invoice.currency), money(invoice.total, invoice.currency)) >= 0) return 'PAID'
  if (compare(money(invoice.amountPaid, invoice.currency), money('0', invoice.currency)) > 0) return 'PARTIALLY_PAID'
  if (Date.parse(invoice.dueDate) < Date.now()) return 'OVERDUE'
  return invoice.status
}

function withStatus(invoice: FinanceInvoice): FinanceInvoice {
  return { ...invoice, status: effectiveStatus(invoice) }
}

function nextInvoiceNumber() {
  const highest = invoices.reduce((max, invoice) => {
    const value = Number(invoice.number.split('-').pop())
    return Number.isFinite(value) && value > max ? value : max
  }, 0)
  return `INV-2026-${String(highest + 1).padStart(3, '0')}`
}

function lineTax(line: { unitPrice: string; quantity: string; taxRateId?: string }, currency: string) {
  const rate = taxRates.find((candidate) => candidate.id === line.taxRateId)
  if (!rate) return money('0', currency)
  return multiply(multiply(money(line.unitPrice, currency), line.quantity), divide(money(rate.rate, currency), '100').amount)
}

function validationErrors(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }) {
  const fieldErrors: Record<string, string> = {}
  if (!result.success && result.error) {
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0] ?? 'form')] = issue.message
  }
  return fieldErrors
}

export const financeHandlers = [
  /* ─── Chart of accounts ─── */
  http.get('*/api/finance/accounts', ({ request }) => {
    const url = new URL(request.url)
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const type = url.searchParams.get('type')
    const status = url.searchParams.get('status')
    const rows = accounts.filter((account) => {
      if (search && !`${account.code} ${account.name}`.toLowerCase().includes(search)) return false
      if (type && account.type !== type) return false
      if (status && account.status !== status) return false
      return true
    })
    return HttpResponse.json({ data: rows })
  }),

  http.get('*/api/finance/accounts/:id', ({ params }) => {
    const account = accounts.find((candidate) => candidate.id === params.id)
    if (!account) return error('NOT_FOUND', 'Account not found', 404)
    return HttpResponse.json({ data: account })
  }),

  http.post('*/api/finance/accounts', async ({ request }) => {
    await delay(150)
    const body = await request.json() as Record<string, unknown>
    const parsed = accountSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION_ERROR', 'Please correct the highlighted fields', 422, validationErrors(parsed))
    const input = parsed.data
    if (accounts.some((account) => account.code.toLowerCase() === input.code.toLowerCase())) {
      return error('DUPLICATE_CODE', 'An account with this code already exists', 409, { code: 'Code must be unique' })
    }
    if (input.parentId && !accounts.some((account) => account.id === input.parentId)) {
      return error('INVALID_PARENT', 'Parent account not found', 422, { parentId: 'Select a valid parent account' })
    }
    const now = new Date().toISOString()
    const account: Account = {
      id: nextId('acc'), code: input.code.toUpperCase(), name: input.name, type: input.type,
      normalBalance: input.normalBalance, parentId: input.parentId || undefined, status: input.status,
      description: input.description, currency: input.currency.toUpperCase(), postedEntryCount: 0,
      createdAt: now, updatedAt: now,
    }
    accounts = [account, ...accounts]
    log(request, 'create', 'Account', account.id, undefined, undefined, account as unknown as Record<string, unknown>)
    return HttpResponse.json({ data: account }, { status: 201 })
  }),

  http.put('*/api/finance/accounts/:id', async ({ params, request }) => {
    await delay(150)
    const existing = accounts.find((account) => account.id === params.id)
    if (!existing) return error('NOT_FOUND', 'Account not found', 404)
    const parsed = accountSchema.safeParse(await request.json())
    if (!parsed.success) return error('VALIDATION_ERROR', 'Please correct the highlighted fields', 422, validationErrors(parsed))
    const input = parsed.data
    if (accounts.some((account) => account.id !== existing.id && account.code.toLowerCase() === input.code.toLowerCase())) {
      return error('DUPLICATE_CODE', 'An account with this code already exists', 409, { code: 'Code must be unique' })
    }
    if (input.parentId === existing.id) return error('CIRCULAR_PARENT', 'An account cannot parent itself', 422, { parentId: 'Choose a different parent' })
    const updated: Account = { ...existing, ...input, code: input.code.toUpperCase(), currency: input.currency.toUpperCase(), parentId: input.parentId || undefined, updatedAt: new Date().toISOString() }
    accounts = accounts.map((account) => account.id === existing.id ? updated : account)
    log(request, 'update', 'Account', existing.id, undefined, existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>)
    return HttpResponse.json({ data: updated })
  }),

  http.delete('*/api/finance/accounts/:id', async ({ params, request }) => {
    await delay(150)
    const existing = accounts.find((account) => account.id === params.id)
    if (!existing) return error('NOT_FOUND', 'Account not found', 404)
    if (existing.postedEntryCount > 0) return error('ACCOUNT_HAS_POSTINGS', 'This account has posted entries. Archive it instead of deleting.', 409)
    if (accounts.some((account) => account.parentId === existing.id)) return error('ACCOUNT_HAS_CHILDREN', 'Move or delete child accounts first', 409)
    const body = await request.json().catch(() => ({})) as { reason?: string }
    if (!body.reason?.trim()) return error('REASON_REQUIRED', 'A reason is required for destructive actions', 422, { reason: 'Required for the audit log' })
    accounts = accounts.filter((account) => account.id !== existing.id)
    log(request, 'delete', 'Account', existing.id, body.reason, existing as unknown as Record<string, unknown>, undefined)
    return HttpResponse.json({ data: { id: existing.id } })
  }),

  /* ─── Customers ─── */
  http.get('*/api/finance/customers', () => HttpResponse.json({ data: customers })),

  http.post('*/api/finance/customers', async ({ request }) => {
    const parsed = customerSchema.safeParse(await request.json())
    if (!parsed.success) return error('VALIDATION_ERROR', 'Please correct the highlighted fields', 422, validationErrors(parsed))
    if (customers.some((customer) => customer.email.toLowerCase() === parsed.data.email.toLowerCase())) {
      return error('DUPLICATE_EMAIL', 'A customer with this email already exists', 409, { email: 'Email must be unique' })
    }
    const customer: Customer = { id: nextId('cus'), ...parsed.data, createdAt: new Date().toISOString() }
    customers = [customer, ...customers]
    log(request, 'create', 'Customer', customer.id, undefined, undefined, customer as unknown as Record<string, unknown>)
    return HttpResponse.json({ data: customer }, { status: 201 })
  }),

  /* ─── Tax rates ─── */
  http.get('*/api/finance/tax-rates', () => HttpResponse.json({ data: taxRates })),

  /* ─── Invoices ─── */
  http.get('*/api/finance/invoices', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const customerId = url.searchParams.get('customerId')
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const rows = invoices.filter((invoice) => {
      if (status && effectiveStatus(invoice) !== status) return false
      if (customerId && invoice.customerId !== customerId) return false
      if (search && !`${invoice.number} ${invoice.customerName}`.toLowerCase().includes(search)) return false
      return true
    }).map(withStatus)
    return HttpResponse.json({ data: rows })
  }),

  http.get('*/api/finance/invoices/:id', ({ params }) => {
    const invoice = invoices.find((candidate) => candidate.id === params.id)
    if (!invoice) return error('NOT_FOUND', 'Invoice not found', 404)
    return HttpResponse.json({ data: withStatus(invoice) })
  }),

  http.post('*/api/finance/invoices', async ({ request }) => {
    await delay(200)
    const body = await request.json() as Record<string, unknown>
    const parsed = invoiceSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION_ERROR', 'Please correct the highlighted fields', 422, validationErrors(parsed))
    const input = parsed.data
    const customer = customers.find((candidate) => candidate.id === input.customerId)
    if (!customer) return error('CUSTOMER_NOT_FOUND', 'Customer not found', 422, { customerId: 'Select a customer' })
    if (Date.parse(input.dueDate) < Date.parse(input.issueDate)) return error('INVALID_DUE_DATE', 'Due date cannot precede issue date', 422, { dueDate: 'Choose a later date' })

    const currency = input.currency.toUpperCase()
    const lines = input.lines.map((line) => ({ ...line, id: nextId('line') }))
    const subtotal = sum(lines.map((line) => multiply(money(line.unitPrice, currency), line.quantity)), currency)
    const tax = sum(lines.map((line) => lineTax(line, currency)), currency)
    const discount = money(input.discount, currency)
    const total = add(subtract(subtotal, discount), tax)
    const now = new Date().toISOString()
    const invoice: FinanceInvoice = {
      id: nextId('inv'), number: nextInvoiceNumber(), customerId: customer.id, customerName: customer.name,
      lines, subtotal: subtotal.amount, discount: discount.amount, tax: tax.amount, total: total.amount,
      amountPaid: '0', currency, issueDate: input.issueDate, dueDate: input.dueDate,
      status: 'DRAFT', notes: input.notes, createdAt: now, updatedAt: now,
    }
    invoices = [invoice, ...invoices]
    log(request, 'create', 'Invoice', invoice.id, undefined, undefined, invoice as unknown as Record<string, unknown>)
    return HttpResponse.json({ data: withStatus(invoice) }, { status: 201 })
  }),

  http.post('*/api/finance/invoices/:id/send', async ({ params, request }) => {
    const invoice = invoices.find((candidate) => candidate.id === params.id)
    if (!invoice) return error('NOT_FOUND', 'Invoice not found', 404)
    if (invoice.status !== 'DRAFT') return error('INVALID_STATE', 'Only draft invoices can be sent', 409)
    const updated: FinanceInvoice = { ...invoice, status: 'SENT', updatedAt: new Date().toISOString() }
    invoices = invoices.map((candidate) => candidate.id === invoice.id ? updated : candidate)
    log(request, 'update', 'Invoice', invoice.id, undefined, { status: invoice.status }, { status: 'SENT' })
    return HttpResponse.json({ data: withStatus(updated) })
  }),

  http.put('*/api/finance/invoices/:id', async ({ params, request }) => {
    const invoice = invoices.find((candidate) => candidate.id === params.id)
    if (!invoice) return error('NOT_FOUND', 'Invoice not found', 404)
    if (invoice.status !== 'DRAFT' && effectiveStatus(invoice) !== 'DRAFT') return error('INVOICE_LOCKED', 'Only draft invoices can be edited', 409)
    const parsed = invoiceSchema.safeParse(await request.json())
    if (!parsed.success) return error('VALIDATION_ERROR', 'Please correct the highlighted fields', 422, validationErrors(parsed))
    const input = parsed.data
    const currency = input.currency.toUpperCase()
    const lines = input.lines.map((line) => ({ ...line, id: nextId('line') }))
    const subtotal = sum(lines.map((line) => multiply(money(line.unitPrice, currency), line.quantity)), currency)
    const tax = sum(lines.map((line) => lineTax(line, currency)), currency)
    const total = add(subtract(subtotal, money(input.discount, currency)), tax)
    const updated: FinanceInvoice = { ...invoice, ...input, lines, currency, subtotal: subtotal.amount, tax: tax.amount, total: total.amount, updatedAt: new Date().toISOString() }
    invoices = invoices.map((candidate) => candidate.id === invoice.id ? updated : candidate)
    log(request, 'update', 'Invoice', invoice.id, undefined, invoice as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>)
    return HttpResponse.json({ data: withStatus(updated) })
  }),

  http.delete('*/api/finance/invoices/:id', async ({ params, request }) => {
    const invoice = invoices.find((candidate) => candidate.id === params.id)
    if (!invoice) return error('NOT_FOUND', 'Invoice not found', 404)
    if (invoice.status !== 'DRAFT' && invoice.status !== 'VOID') return error('INVOICE_LOCKED', 'Only draft or void invoices can be deleted', 409)
    const body = await request.json().catch(() => ({})) as { reason?: string }
    if (!body.reason?.trim()) return error('REASON_REQUIRED', 'A reason is required', 422, { reason: 'Required for the audit log' })
    invoices = invoices.filter((candidate) => candidate.id !== invoice.id)
    log(request, 'delete', 'Invoice', invoice.id, body.reason, invoice as unknown as Record<string, unknown>, undefined)
    return HttpResponse.json({ data: { id: invoice.id } })
  }),

  /* ─── Payments ─── */
  http.get('*/api/finance/payments', () => HttpResponse.json({ data: payments })),

  http.post('*/api/finance/payments', async ({ request }) => {
    await delay(200)
    const body = await request.json() as {
      direction: 'incoming' | 'outgoing'; amount: string; currency: string; date: string; method: string
      reference: string; idempotencyKey: string
      allocations: Array<{ documentId: string; documentType: 'invoice' | 'bill'; amount: string }>
    }
    if (payments.some((payment) => payment.idempotencyKey === body.idempotencyKey)) {
      return error('DUPLICATE_IDEMPOTENCY_KEY', 'Payment already processed with this key', 409, { idempotencyKey: 'Key already used' })
    }
    const allocated = sum(body.allocations.map((entry) => money(entry.amount, body.currency)), body.currency)
    if (compare(allocated, money(body.amount, body.currency)) !== 0) {
      return error('ALLOCATION_MISMATCH', 'Allocations must equal the payment amount', 422, { allocations: 'Total allocated must equal payment amount' })
    }
    for (const entry of body.allocations) {
      if (entry.documentType !== 'invoice') continue
      const invoice = invoices.find((candidate) => candidate.id === entry.documentId)
      if (!invoice) return error('DOCUMENT_NOT_FOUND', 'Invoice not found', 422)
      const nextPaid = add(money(invoice.amountPaid, invoice.currency), money(entry.amount, invoice.currency))
      if (compare(nextPaid, money(invoice.total, invoice.currency)) > 0) {
        return error('OVERPAYMENT', `${invoice.number} cannot be overpaid`, 409, { allocations: `Amount due: ${amountDue(invoice).amount}` })
      }
    }
    const payment: FinancePayment = {
      id: nextId('pay'), number: `PAY-2026-${String(payments.length + 1).padStart(3, '0')}`,
      direction: body.direction, amount: body.amount, currency: body.currency.toUpperCase(), date: body.date,
      method: body.method, reference: body.reference, idempotencyKey: body.idempotencyKey,
      allocations: body.allocations, createdAt: new Date().toISOString(),
    }
    payments = [payment, ...payments]
    for (const entry of body.allocations) {
      invoices = invoices.map((invoice) => {
        if (invoice.id !== entry.documentId) return invoice
        const paid = add(money(invoice.amountPaid, invoice.currency), money(entry.amount, invoice.currency))
        return { ...invoice, amountPaid: paid.amount, updatedAt: new Date().toISOString() }
      })
    }
    log(request, 'create', 'Payment', payment.id, undefined, undefined, payment as unknown as Record<string, unknown>)
    return HttpResponse.json({ data: payment }, { status: 201 })
  }),

  /* ─── AR aging ─── */
  http.get('*/api/finance/ar-aging', () => {
    const now = Date.now()
    const day = 86_400_000
    const bucketOf = (invoice: FinanceInvoice) => {
      const days = Math.max(0, Math.floor((now - Date.parse(invoice.dueDate)) / day))
      return days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+'
    }
    const open = invoices.filter((invoice) => {
      const status = effectiveStatus(invoice)
      return status !== 'DRAFT' && status !== 'VOID' && status !== 'PAID' && compare(amountDue(invoice), money('0', invoice.currency)) > 0
    })
    const rows = open.map((invoice) => ({ id: invoice.id, number: invoice.number, customerName: invoice.customerName, dueDate: invoice.dueDate, amountDue: amountDue(invoice).amount, currency: invoice.currency, bucket: bucketOf(invoice) }))
    const totals: Record<string, string> = { '0-30': '0', '31-60': '0', '61-90': '0', '90+': '0' }
    for (const row of rows) totals[row.bucket] = add(money(totals[row.bucket], row.currency), money(row.amountDue, row.currency)).amount
    return HttpResponse.json({ data: { rows, totals, total: sum(Object.values(totals).map((value) => money(value, 'NGN')), 'NGN').amount } })
  }),

  /* ─── Audit & meta ─── */
  http.get('*/api/finance/audit', ({ request }) => {
    const url = new URL(request.url)
    const entity = url.searchParams.get('entity')
    const actorFilter = url.searchParams.get('actor')
    const rows = auditEvents.filter((event) => {
      if (entity && event.entity !== entity) return false
      if (actorFilter && !event.actor.toLowerCase().includes(actorFilter.toLowerCase())) return false
      return true
    })
    return HttpResponse.json({ data: rows })
  }),

  http.post('*/api/finance/audit', async ({ request }) => {
    const body = await request.json() as Pick<AuditEvent, 'action' | 'entity' | 'entityId' | 'reason' | 'before' | 'after'>
    log(request, body.action, body.entity, body.entityId, body.reason, body.before, body.after)
    return HttpResponse.json({ data: { ok: true } }, { status: 201 })
  }),

  http.get('*/api/finance/periods', () => HttpResponse.json({ data: seedPeriods })),

  http.get('*/api/finance/meta', () => {
    const statuses = invoices.map(effectiveStatus)
    const receivables = invoices.reduce((total, invoice) => {
      const status = effectiveStatus(invoice)
      return status === 'DRAFT' || status === 'VOID' || status === 'PAID' ? total : add(total, amountDue(invoice))
    }, money('0', 'NGN'))
    const overdue = invoices.reduce((total, invoice) => effectiveStatus(invoice) === 'OVERDUE' ? add(total, amountDue(invoice)) : total, money('0', 'NGN'))
    return HttpResponse.json({
      data: {
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter((account) => account.status === 'active').length,
        archivedAccounts: accounts.filter((account) => account.status === 'archived').length,
        postedLines: accounts.reduce((total, account) => total + account.postedEntryCount, 0),
        totalInvoices: invoices.length,
        draftInvoices: statuses.filter((status) => status === 'DRAFT').length,
        overdueInvoices: statuses.filter((status) => status === 'OVERDUE').length,
        paidInvoices: statuses.filter((status) => status === 'PAID').length,
        receivables: receivables.amount,
        overdueAmount: overdue.amount,
        nextInvoiceNumber: nextInvoiceNumber(),
        periods: seedPeriods,
      },
    })
  }),
]
