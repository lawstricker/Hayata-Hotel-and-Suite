import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Account } from '@/types/domain'
import type { AccountInput } from '@/features/finance/schemas'
import { FinanceApiError, financeRequest } from './client'

export const accountsKey = ['finance', 'accounts'] as const

export interface AccountFilters {
  search?: string
  type?: string
  status?: string
}

function queryString(filters: AccountFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  const value = params.toString()
  return value ? `?${value}` : ''
}

export function useAccounts(filters: AccountFilters = {}) {
  return useQuery({
    queryKey: [...accountsKey, filters],
    queryFn: () => financeRequest<Account[]>(`/accounts${queryString(filters)}`),
  })
}

export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: [...accountsKey, 'detail', id],
    queryFn: () => financeRequest<Account>(`/accounts/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateAccount() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AccountInput) => financeRequest<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (account) => {
      void client.invalidateQueries({ queryKey: accountsKey })
      void client.invalidateQueries({ queryKey: ['finance', 'meta'] })
      toast.success('Account created', { description: `${account.code} · ${account.name}` })
    },
    onError: (error: Error) => toast.error('Could not create account', { description: error.message }),
  })
}

export function useUpdateAccount() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AccountInput }) => financeRequest<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (account) => {
      void client.invalidateQueries({ queryKey: accountsKey })
      void client.invalidateQueries({ queryKey: ['finance', 'meta'] })
      toast.success('Account updated', { description: `${account.code} · ${account.name}` })
    },
    onError: (error: Error) => toast.error('Could not update account', { description: error.message }),
  })
}

export function useDeleteAccount() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => financeRequest<{ id: string }>(`/accounts/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: accountsKey })
      void client.invalidateQueries({ queryKey: ['finance', 'meta'] })
      void client.invalidateQueries({ queryKey: ['finance', 'audit'] })
      toast.success('Account deleted')
    },
    onError: (error: unknown) => {
      const message = error instanceof FinanceApiError ? error.message : 'Could not delete account'
      toast.error('Delete blocked', { description: message })
    },
  })
}
