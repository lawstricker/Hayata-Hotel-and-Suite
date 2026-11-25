import { AnimatePresence, motion } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/error-boundary'
import { cn } from '@/lib/utils'
import { useLiveSimulation } from '@/hooks/useLiveSimulation'
import { usePrinterQueue } from '@/hooks/usePrinterQueue'
import { applyTheme, useAuthStore } from '@/store/authStore'
import { useRbacStore } from '@/store/rbacStore'
import { CommandPalette } from './command-palette'
import { DesktopSidebar, MobileSidebar } from './sidebar'
import { mobileNavigation } from './navigation'
import { Topbar } from './topbar'

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const collapsed = useAuthStore((state) => state.sidebarCollapsed)
  const role = useAuthStore((state) => state.user?.role ?? 'SUPER_ADMIN')
  const theme = useAuthStore((state) => state.theme)
  const permissionsByRole = useRbacStore((state) => state.permissions)
  const rolePermissions = permissionsByRole[role] ?? []
  const location = useLocation()
  useLiveSimulation(true)
  usePrinterQueue()

  useEffect(() => { applyTheme(theme) }, [theme])

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar collapsed={collapsed} />
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <div className={cn('min-h-screen transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]')}>
        <Topbar onMenuClick={() => setMobileNavOpen(true)} onSearchClick={() => setCommandOpen(true)} />
        <main className="mx-auto w-full max-w-[1600px] px-3 pb-24 pt-5 sm:px-5 sm:pt-6 lg:px-7 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="page-enter"
            >
              <ErrorBoundary key={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        <div className="grid grid-cols-5">
          {mobileNavigation.filter((item) => item.permissions.some((permission) => rolePermissions.includes(permission))).slice(0, 4).map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/staff'} className={({ isActive }) => cn('flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-bold transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')}>
              {({ isActive }) => <><item.icon className={cn('size-[19px]', isActive && 'fill-primary/10')} /><span>{item.label}</span></>}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMobileNavOpen(true)} className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-bold text-muted-foreground"><MoreHorizontal className="size-[19px]" /><span>More</span></button>
        </div>
      </nav>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
