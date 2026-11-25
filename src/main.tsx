import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// TODO(API): the finance API is mocked in-process in development (see financeRequest),
// so no service worker is installed and guest/admin pages are never intercepted.
createRoot(document.getElementById('root')!).render(<App />)
