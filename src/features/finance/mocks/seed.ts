import type { Account, AuditEvent, Customer, FiscalPeriod, FinanceInvoice, FinancePayment, TaxRate } from '@/types/domain'

const stamp = (day: number) => new Date(Date.UTC(2026, 10, day, 9, 0, 0)).toISOString()

function account(
  id: string,
  code: string,
  name: string,
  type: Account['type'],
  normalBalance: Account['normalBalance'],
  parentId: string | undefined,
  postedEntryCount: number,
): Account {
  return {
    id, code, name, type, normalBalance, parentId,
    status: 'active', description: `${name} account`, currency: 'NGN',
    postedEntryCount, createdAt: stamp(1), updatedAt: stamp(20),
  }
}

/** Hierarchical chart of accounts with realistic parent/child relationships. */
export const seedAccounts: Account[] = [
  account('acc-1000', '1000', 'Assets', 'Asset', 'debit', undefined, 0),
  account('acc-1100', '1100', 'Cash and Bank', 'Asset', 'debit', 'acc-1000', 0),
  account('acc-1110', '1110', 'Petty Cash', 'Asset', 'debit', 'acc-1100', 4),
  account('acc-1120', '1120', 'Bank - Main Account', 'Asset', 'debit', 'acc-1100', 18),
  account('acc-1200', '1200', 'Accounts Receivable', 'Asset', 'debit', 'acc-1000', 32),
  account('acc-1300', '1300', 'Inventory', 'Asset', 'debit', 'acc-1000', 11),
  account('acc-2000', '2000', 'Liabilities', 'Liability', 'credit', undefined, 0),
  account('acc-2100', '2100', 'Accounts Payable', 'Liability', 'credit', 'acc-2000', 21),
  account('acc-2200', '2200', 'Accrued Expenses', 'Liability', 'credit', 'acc-2000', 6),
  account('acc-3000', '3000', 'Equity', 'Equity', 'credit', undefined, 0),
  account('acc-3100', '3100', 'Retained Earnings', 'Equity', 'credit', 'acc-3000', 2),
  account('acc-4000', '4000', 'Revenue', 'Revenue', 'credit', undefined, 0),
  account('acc-4100', '4100', 'Room Revenue', 'Revenue', 'credit', 'acc-4000', 47),
  account('acc-4200', '4200', 'Food & Beverage Revenue', 'Revenue', 'credit', 'acc-4000', 29),
  account('acc-5000', '5000', 'Expenses', 'Expense', 'debit', undefined, 0),
  account('acc-5100', '5100', 'Cost of Sales', 'Expense', 'debit', 'acc-5000', 15),
  account('acc-5200', '5200', 'Payroll Expense', 'Expense', 'debit', 'acc-5000', 12),
  { ...account('acc-5300', '5300', 'Supplies (archived)', 'Expense', 'debit', 'acc-5000', 0), status: 'archived' },
]

export const seedPeriods: FiscalPeriod[] = [
  { id: 'fp-2026-11', name: 'November 2026', startDate: '2026-11-01T00:00:00.000Z', endDate: '2026-11-30T23:59:59.000Z', status: 'OPEN' },
  { id: 'fp-2026-10', name: 'October 2026', startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-10-31T23:59:59.000Z', status: 'LOCKED' },
]

export const seedCustomers: Customer[] = [
  { id: 'cus-001', name: 'Meridian Events Ltd', email: 'accounts@meridianevents.example', phone: '+234 801 234 5678', address: '14 Marina Road, Lagos', currency: 'NGN', paymentTermsDays: 30, status: 'active', createdAt: stamp(2) },
  { id: 'cus-002', name: 'Atlas Corporate Travels', email: 'finance@atlastravels.example', phone: '+234 802 555 0199', address: '8 Victoria Island, Lagos', currency: 'NGN', paymentTermsDays: 14, status: 'active', createdAt: stamp(4) },
  { id: 'cus-003', name: 'Lagos Business Council', email: 'billing@lbc.example', address: '1 Council Way, Lagos', currency: 'NGN', paymentTermsDays: 45, status: 'active', createdAt: stamp(6) },
]

export const seedTaxRates: TaxRate[] = [
  { id: 'tax-vat', code: 'VAT', name: 'VAT 7.5%', rate: '7.5', accountId: 'acc-2200', status: 'active', createdAt: stamp(1) },
  { id: 'tax-service', code: 'SVC', name: 'Service charge 5%', rate: '5', accountId: 'acc-2200', status: 'active', createdAt: stamp(1) },
  { id: 'tax-zero', code: 'ZERO', name: 'Zero rated', rate: '0', accountId: 'acc-4100', status: 'active', createdAt: stamp(1) },
]

function invoice(
  id: string, number: string, customer: Customer, issueDay: number, dueDay: number,
  line: [string, string, string], total: string, paid: string, status: FinanceInvoice['status'], taxRateId?: string,
): FinanceInvoice {
  return {
    id, number, customerId: customer.id, customerName: customer.name,
    lines: [{ id: `${id}-line-1`, description: line[0], quantity: line[1], unitPrice: line[2], taxRateId }],
    subtotal: total, discount: '0', tax: '0', total,
    amountPaid: paid, currency: customer.currency,
    issueDate: stamp(issueDay), dueDate: stamp(dueDay), status,
    notes: 'Thank you for choosing Hayata.', createdAt: stamp(issueDay), updatedAt: stamp(issueDay + 1),
  }
}

export const seedInvoices: FinanceInvoice[] = [
  invoice('inv-001', 'INV-2026-001', seedCustomers[0], 1, 30, ['Conference package · 3 days', '3', '41666.67'], '125000.01', '0', 'DRAFT'),
  invoice('inv-002', 'INV-2026-002', seedCustomers[1], 4, 18, ['Corporate accommodation', '10', '8500'], '85000', '25000', 'SENT', 'tax-vat'),
  invoice('inv-003', 'INV-2026-003', seedCustomers[2], 6, 21, ['Banquet hall & catering', '1', '240000'], '240000', '100000', 'PARTIALLY_PAID', 'tax-service'),
  invoice('inv-004', 'INV-2026-004', seedCustomers[0], 8, 22, ['Executive suite · 4 nights', '4', '14000'], '56000', '56000', 'PAID'),
  invoice('inv-005', 'INV-2026-005', seedCustomers[1], 2, 10, ['Training retreat · 12 guests', '12', '14833.33'], '178000', '0', 'OVERDUE', 'tax-vat'),
  invoice('inv-006', 'INV-2026-006', seedCustomers[2], 5, 20, ['Airport transfer', '2', '16000'], '32000', '0', 'VOID'),
]

export const seedPayments: FinancePayment[] = [
  { id: 'pay-001', number: 'PAY-2026-001', direction: 'incoming', amount: '100000', currency: 'NGN', date: stamp(15), method: 'Bank transfer', reference: 'TRF-88301', idempotencyKey: 'idem-seed-001', allocations: [{ documentId: 'inv-003', documentType: 'invoice', amount: '100000' }], createdAt: stamp(15) },
  { id: 'pay-002', number: 'PAY-2026-002', direction: 'incoming', amount: '56000', currency: 'NGN', date: stamp(12), method: 'Card', reference: 'CARD-2291', idempotencyKey: 'idem-seed-002', allocations: [{ documentId: 'inv-004', documentType: 'invoice', amount: '56000' }], createdAt: stamp(12) },
  { id: 'pay-003', number: 'PAY-2026-003', direction: 'incoming', amount: '25000', currency: 'NGN', date: stamp(17), method: 'Cash', reference: 'CSH-771', idempotencyKey: 'idem-seed-003', allocations: [{ documentId: 'inv-002', documentType: 'invoice', amount: '25000' }], createdAt: stamp(17) },
  { id: 'pay-004', number: 'PAY-2026-004', direction: 'outgoing', amount: '42000', currency: 'NGN', date: stamp(18), method: 'Bank transfer', reference: 'TRF-88399', idempotencyKey: 'idem-seed-004', allocations: [], createdAt: stamp(18) },
]

export const seedAuditEvents: AuditEvent[] = [
  { id: 'audit-seed-1', action: 'create', entity: 'Account', entityId: 'acc-4200', actor: 'Tobias Reed', timestamp: stamp(20), ip: '127.0.0.1', after: { code: '4200', name: 'Food & Beverage Revenue' } },
  { id: 'audit-seed-2', action: 'update', entity: 'Account', entityId: 'acc-1120', actor: 'Grace Liu', timestamp: stamp(19), ip: '127.0.0.1', before: { name: 'Bank Account' }, after: { name: 'Bank - Main Account' } },
]
