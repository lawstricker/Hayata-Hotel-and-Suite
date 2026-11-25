import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '@/components/providers'
import { SeoManager } from '@/components/seo-manager'
import { AppRoutes } from '@/app/app-routes'
import { applyTheme, useAuthStore } from '@/store/authStore'
import { useServerBootstrap } from '@/hooks/useServerBootstrap'

export default function App() {
  const theme = useAuthStore((state) => state.theme)
  useEffect(() => { applyTheme(theme) }, [theme])
  useServerBootstrap()
  return (
    <AppProviders>
      <BrowserRouter>
        <SeoManager />
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  )
}
