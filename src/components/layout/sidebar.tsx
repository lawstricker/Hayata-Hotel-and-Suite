import { ChevronLeft, ChevronRight, Hotel, LifeBuoy, LogOut, Sparkles, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { navigation } from './navigation'
import { useAuthStore } from '@/store/authStore'
import { useRbacStore } from '@/store/rbacStore'
import type { Role } from '@/types/domain'

interface SidebarContentProps {
  collapsed?: boolean
  onNavigate?: () => void
  onLogout?: () => void
}

export function SidebarContent({ collapsed = false, onNavigate, onLogout }: SidebarContentProps) {
  const role = useAuthStore((state) => state.user?.role ?? 'SUPER_ADMIN')
  const toggleSidebar = useAuthStore((state) => state.toggleSidebar)
  const permissionsByRole = useRbacStore((state) => state.permissions)
  const rolePermissions = permissionsByRole[role] ?? []

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn('flex h-17 items-center border-b border-sidebar-border px-4', collapsed ? 'justify-center px-2' : 'justify-between')}>
        <NavLink to="/" onClick={onNavigate} className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/60" aria-label="Hayata HMS home">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-950/25">
            <Hotel className="size-[18px]" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-display text-[15px] font-extrabold tracking-tight text-white">Hayata</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-muted">Hotel & Suite</span>
            </span>
          )}
        </NavLink>
        {!collapsed && (
          <button type="button" onClick={toggleSidebar} className="hidden size-8 items-center justify-center rounded-lg text-sidebar-muted transition hover:bg-white/5 hover:text-white lg:flex" aria-label="Collapse sidebar">
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      <nav className="scrollbar flex-1 overflow-y-auto px-2.5 py-4" aria-label="Primary navigation">
        {!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-muted/70">Workspace</p>}
        <div className="space-y-5">
          {navigation.map((group) => {
            const visibleItems = group.items.filter((item) => item.permissions.some((permission) => rolePermissions.includes(permission)))
            if (!visibleItems.length) return null
            return (
              <div key={group.label}>
                {!collapsed && <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-muted/60">{group.label}</p>}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const link = (
                      <NavLink
                        to={item.path}
                        end={item.path === '/'}
                        onClick={onNavigate}
                        className={({ isActive }) => cn(
                          'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/50',
                          collapsed && 'justify-center px-0',
                          isActive ? 'bg-sidebar-accent text-white' : 'text-sidebar-muted hover:bg-white/[0.045] hover:text-sidebar-foreground',
                        )}
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && <span className="absolute -left-2.5 h-5 w-0.5 rounded-r-full bg-teal-400" />}
                            <item.icon className={cn('size-[17px] shrink-0', isActive ? 'text-teal-300' : 'text-sidebar-muted group-hover:text-sidebar-foreground')} aria-hidden="true" />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                          </>
                        )}
                      </NavLink>
                    )
                    return collapsed ? (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : <div key={item.path}>{link}</div>
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-2.5">
        {!collapsed && (
          <div className="mb-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.055] p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><Sparkles className="size-3.5" /> Operations health</div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-sidebar-muted"><span>All systems</span><span className="font-bold text-emerald-300">Operational</span></div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[92%] rounded-full bg-emerald-400" /></div>
          </div>
        )}
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
          {!collapsed && <Button variant="ghost" className="h-9 flex-1 justify-start px-3 text-sidebar-muted hover:bg-white/5 hover:text-white"><LifeBuoy /> Support</Button>}
          {collapsed && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="text-sidebar-muted hover:bg-white/5 hover:text-white"><LifeBuoy /></Button></TooltipTrigger><TooltipContent side="right">Support</TooltipContent></Tooltip>}
          {!collapsed && <Button variant="ghost" size="icon-sm" className="text-sidebar-muted hover:bg-white/5 hover:text-white" onClick={onLogout} aria-label="Log out"><LogOut /></Button>}
        </div>
      </div>
    </div>
  )
}

export function DesktopSidebar({ collapsed }: { collapsed: boolean }) {
  const toggleSidebar = useAuthStore((state) => state.toggleSidebar)
  return (
    <aside className={cn('fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border transition-[width] duration-200 lg:block', collapsed ? 'w-[76px]' : 'w-[248px]')}>
      <SidebarContent collapsed={collapsed} />
      {collapsed && (
        <button type="button" onClick={toggleSidebar} className="absolute -right-3 top-[76px] z-50 flex size-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-muted shadow-md transition hover:text-white" aria-label="Expand sidebar">
          <ChevronRight className="size-3.5" />
        </button>
      )}
    </aside>
  )
}

export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <div className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
      <button type="button" onClick={() => onOpenChange(false)} className={cn('absolute inset-0 bg-slate-950/55 backdrop-blur-sm transition-opacity', open ? 'opacity-100' : 'opacity-0')} aria-label="Close navigation" />
      <aside className={cn('absolute inset-y-0 left-0 w-[282px] shadow-2xl transition-transform duration-300', open ? 'translate-x-0' : '-translate-x-full')}>
        <button type="button" onClick={() => onOpenChange(false)} className="absolute right-3 top-4 z-10 flex size-8 items-center justify-center rounded-lg text-sidebar-muted hover:bg-white/10 hover:text-white" aria-label="Close navigation"><X className="size-4" /></button>
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </aside>
    </div>
  )
}

export function roleLabel(role: Role) {
  return role.toLowerCase().split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
}
