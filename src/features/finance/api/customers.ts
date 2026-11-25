import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Customer } from '@/types/domain'
import type { customerSchema } from '@/features/finance/schemas'
import type { z } from 'zod'
import { financeRequest } from './client'

type CustomerInput = z.input<typeof customerSchema>

export function useCustomers() {
  return useQuery({ queryKey: ['finance', 'customers'], queryFn: () => financeRequest<Customer[]>('/customers') })
}

export function useCreateCustomer() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerInput) => financeRequest<Customer>('/customers', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (customer) => {
      void client.invalidateQueries({ queryKey: ['finance', 'customers'] })
      toast.success('Customer added', { description: customer.name })
    },
    onError: (error: Error) => toast.error('Could not add customer', { description: error.message }),
  })
}
