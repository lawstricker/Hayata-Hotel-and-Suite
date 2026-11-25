import { z } from 'zod'

export const moneyString = z.string().regex(/^-?\d+(\.\d+)?$/, 'Enter a valid decimal amount')

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date')

export const accountSchema = z.object({
  code: z.string().trim().min(2, 'Code must be at least 2 characters').max(20).regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers and hyphens only'),
  name: z.string().trim().min(2, 'Name is required').max(100),
  type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
  normalBalance: z.enum(['debit', 'credit']),
  parentId: z.union([z.string(), z.literal('')]).optional(),
  status: z.enum(['active', 'archived']),
  description: z.string().max(500).optional(),
  currency: z.string().trim().length(3, 'Use a 3-letter currency code'),
})

export type AccountInput = z.infer<typeof accountSchema>

export const journalLineSchema = z.object({
  accountId: z.string().min(1, 'Select an account'),
  description: z.string().trim().min(1, 'Description is required'),
  debit: moneyString,
  credit: moneyString,
  costCenter: z.string().optional(),
  taxCode: z.string().optional(),
})

export const journalEntrySchema = z.object({
  number: z.string().min(1),
  date: isoDate,
  reference: z.string().optional(),
  memo: z.string().min(1, 'Memo is required'),
  fiscalPeriodId: z.string().min(1),
  lines: z.array(journalLineSchema).min(2, 'A journal entry needs at least 2 lines'),
}).superRefine((value, ctx) => {
  const debits = value.lines.reduce((total, line) => total + Number(line.debit), 0)
  const credits = value.lines.reduce((total, line) => total + Number(line.credit), 0)
  if (Math.abs(debits - credits) > 1e-9) {
    ctx.addIssue({ code: 'custom', message: 'Debits must equal credits before posting', path: ['lines'] })
  }
})

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Customer name is required'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().trim().length(3),
  paymentTermsDays: z.coerce.number().int().min(0).max(365),
  status: z.enum(['active', 'inactive']),
})

export type CustomerInput = z.infer<typeof customerSchema>

export const invoiceLineSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  quantity: moneyString,
  unitPrice: moneyString,
  taxRateId: z.string().optional(),
})

export const invoiceSchema = z.object({
  number: z.string().min(1),
  customerId: z.string().min(1, 'Select a customer'),
  lines: z.array(invoiceLineSchema).min(1),
  discount: moneyString,
  currency: z.string().length(3),
  issueDate: isoDate,
  dueDate: isoDate,
  notes: z.string().optional(),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>

export const billSchema = z.object({
  number: z.string().min(1),
  vendorId: z.string().min(1, 'Select a vendor'),
  lines: z.array(invoiceLineSchema).min(1),
  currency: z.string().length(3),
  issueDate: isoDate,
  dueDate: isoDate,
})

export const paymentSchema = z.object({
  direction: z.enum(['incoming', 'outgoing']),
  amount: moneyString,
  currency: z.string().length(3),
  date: isoDate,
  method: z.string().min(1),
  reference: z.string().min(1),
  idempotencyKey: z.string().min(8),
  allocations: z.array(z.object({
    documentId: z.string().min(1),
    documentType: z.enum(['invoice', 'bill']),
    amount: moneyString,
  })).min(1),
})

export const expenseSchema = z.object({
  claimant: z.string().min(1),
  category: z.string().min(1),
  accountId: z.string().min(1),
  amount: moneyString,
  currency: z.string().length(3),
  description: z.string().min(1),
})

export const taxRateSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2),
  rate: moneyString.refine((value) => Number(value) >= 0 && Number(value) <= 100, 'Rate must be between 0 and 100'),
  accountId: z.string().min(1),
  status: z.enum(['active', 'archived']).default('active'),
})

export const fiscalPeriodSchema = z.object({
  name: z.string().min(2),
  startDate: isoDate,
  endDate: isoDate,
  status: z.enum(['OPEN', 'LOCKED', 'CLOSED']).default('OPEN'),
}).refine((value) => Date.parse(value.endDate) >= Date.parse(value.startDate), {
  message: 'End date must follow start date',
  path: ['endDate'],
})
