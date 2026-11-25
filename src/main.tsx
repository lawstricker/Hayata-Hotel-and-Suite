import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

async function start() {
  // TODO(API): MSW serves /api/finance/* in development; production uses the REST backend.
  if (import.meta.env.DEV) {
    const { financeWorker } = await import('@/features/finance/mocks/browser')
    await financeWorker.start()
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
