import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applySeo, resolvePageMeta } from '@/lib/seo'
import { useSeoStore } from '@/store/seoStore'

/** Keeps title, meta tags, canonical URL and structured data in sync with the route. */
export function SeoManager() {
  const location = useLocation()
  const settings = useSeoStore((state) => state.settings)

  useEffect(() => {
    const internal = /^\/(staff|display|room)(\/|$)/.test(location.pathname)
    applySeo(resolvePageMeta(location.pathname, settings), settings, !internal)
  }, [location.pathname, settings])

  return null
}
