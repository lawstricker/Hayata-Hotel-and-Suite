import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FinanceInvoice, FinancePayment, TaxRate } from '@/types/domain'
import type { invoiceSchema } from '@/features/finance/schemas'
import type { z } from 'zod'
import { FinanceApiError, financeRequest } from './client'

type InvoiceInput = z.input<typeof invoiceSchema>
export const invoicesKey = ['finance', 'invoices'] as const
export const paymentsKey = ['finance', 'payments'] as const

export interface InvoiceFilters {
  status?: string
  customerId?: string
  search?: string
}

function queryString(filters: InvoiceFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.customerId) params.set('customerId', filters.customerId)
  if (filters.search) params.set('search', filters.search)
  const value = params.toString()
  return value ? `?${value}` : ''
}

export interface AgingRow {
  id: string
  number: string
  customerName: string
  dueDate: string
  amountDue: string
  currency: string
  bucket: '0-30' | '31-60' | '61-90' | '90+'
}

export interface AgingReport {
  rows: AgingRow[]
  totals: Record<AgingRow['bucket'], string>
  total: string
}

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: [...invoicesKey, filters],
    queryFn: () => financeRequest<FinanceInvoice[]>(`/invoices${queryString(filters)}`),
  })
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [...invoicesKey, 'detail', id],
    queryFn: () => financeRequest<FinanceInvoice>(`/invoices/${id}`),
    enabled: Boolean(id),
  })
}

export function useTaxRates() {
  return useQuery({ queryKey: ['finance', 'tax-rates'], queryFn: () => financeRequest<TaxRate[]>('/tax-rates') })
}

export function useArAging() {
  return useQuery({ queryKey: ['finance', 'ar-aging'], queryFn: () => financeRequest<AgingReport>('/ar-aging') })
}

export function usePayments() {
  return useQuery({ queryKey: paymentsKey, queryFn: () => financeRequest<FinancePayment[]>('/payments') })
}

function invalidateInvoiceQueries(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: invoicesKey })
  void client.invalidateQueries({ queryKey: paymentsKey })
  void client.invalidateQueries({ queryKey: ['finance', 'ar-aging'] })
  void client.invalidateQueries({ queryKey: ['finance', 'meta'] })
  void client.invalidateQueries({ queryKey: ['finance', 'audit'] })
}

export function useCreateInvoice() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: InvoiceInput) => financeRequest<FinanceInvoice>('/invoices', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (invoice) => {
      invalidateInvoiceQueries(client)
      toast.success('Invoice created', { description: `${invoice.number} · ${invoice.customerName} · saved as draft` })
    },
    onError: (error: Error) => toast.error('Could not create invoice', { description: error.message }),
  })
}

export function useSendInvoice() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeRequest<FinanceInvoice>(`/invoices/${id}/send`, { method: 'POST', body: '{}' }),
    onSuccess: (invoice) => { invalidateInvoiceQueries(client); toast.success(`${invoice.number} sent to ${invoice.customerName}`) },
    onError: (error: Error) => toast.error('Could not send invoice', { description: error.message }),
  })
}

export interface PaymentInput {
  direction: 'incoming' | 'outgoing'
  amount: string
  currency: string
  date: string
  method: string
  reference: string
  idempotencyKey: string
  allocations: Array<{ documentId: string; documentType: 'invoice' | 'bill'; amount: string }>
}

export function useRecordPayment() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: PaymentInput) => financeRequest<FinancePayment>('/payments', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (payment) => { invalidateInvoiceQueries(client); toast.success('Payment recorded', { description: `${payment.number} · ${payment.reference}` }) },
    onError: (error: unknown) => toast.error('Payment rejected', { description: error instanceof FinanceApiError ? error.message : 'Could not record payment' }),
  })
}
