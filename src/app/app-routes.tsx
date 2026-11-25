import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { legacyStaffRedirects } from '@/lib/staff-routes'
import { PublicRoutes } from '@/app/public-routes'
import { StaffRoutes } from '@/app/staff-routes'

const RoomMenuPage = lazy(() => import('@/features/guest/room-menu-page').then((module) => ({ default: module.RoomMenuPage })))

function RouteLoader() {
  return <div className="space-y-5 p-6"><div className="space-y-2"><Skeleton className="h-8 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div><Skeleton className="h-96 rounded-xl" /></div>
}

function PublicOrLegacyRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const path = location.pathname.length > 1 ? location.pathname.replace(/\/$/, '') : location.pathname
  const target = legacyStaffRedirects[path]
  if (target) return <Navigate to={`${target}${location.search}`} replace />
  if (path.startsWith('/guests/')) return <Navigate to={`/staff${path}${location.search}`} replace />
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/room/:roomNumber/menu" element={<RoomMenuPage />} />
        <Route path="/staff/*" element={<StaffRoutes />} />
        <Route path="*" element={<PublicOrLegacyRoute><PublicRoutes /></PublicOrLegacyRoute>} />
      </Routes>
    </Suspense>
  )
}
