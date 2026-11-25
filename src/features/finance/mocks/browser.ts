import { setupWorker } from 'msw/browser'
import { financeHandlers } from './handlers'

export const financeWorker = setupWorker(...financeHandlers)
