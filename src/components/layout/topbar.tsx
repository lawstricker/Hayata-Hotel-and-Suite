import { Bell, Check, ChevronDown, Command as CommandIcon, LogOut, Menu, Moon, Search, Settings, Sun, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, initials } from '@/lib/utils'
import { canAny, roleLabels } from '@/lib/rbac'
import { navigation } from './navigation'
import { useAuthStore } from '@/store/authStore'
import { useHotelStore } from '@/store/hotelStore'
import type { Role } from '@/types/domain'

const pageNames: Record<string, string> = {
  reservations: 'Reservations', 'front-desk': 'Front Desk', rooms: 'Rooms & Room Types', housekeeping: 'Housekeeping', maintenance: 'Maintenance', guests: 'Guest Directory', crm: 'CRM', restaurant: 'Restaurant', bar: 'Bar', inventory: 'Inventory', billing: 'Billing & Payments', reports: 'Reports & Analytics', staff: 'Staff & HR', events: 'Events & Banquet', settings: 'Settings',
}

interface TopbarProps {
  onMenuClick: () => void
  onSearchClick: () => void
}

export function Topbar({ onMenuClick, onSearchClick }: TopbarProps) {
  const [notificationOpen, setNotificationOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const theme = useAuthStore((state) => state.theme)
  const setTheme = useAuthStore((state) => state.setTheme)
  const switchRole = useAuthStore((state) => state.switchRole)
  const logout = useAuthStore((state) => state.logout)
  const alerts = useHotelStore((state) => state.alerts)
  const visibleAlerts = alerts.filter((alert) => !alert.acknowledged && !alert.snoozedUntil)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onSearchClick()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSearchClick])

  if (!user) return null

  const root = location.pathname.split('/')[1]
  const pageName = root ? pageNames[root] ?? root.replaceAll('-', ' ') : 'Dashboard'

  function handleRoleChange(role: Role) {
    switchRole(role)
    const currentSection = navigation.flatMap((group) => group.items).find((item) => location.pathname.startsWith(item.path) && item.path !== '/')
    if (currentSection && !canAny(role, currentSection.permissions)) navigate('/')
    toast.success(`Switched to ${roleLabels[role]}`, { description: 'Navigation and data visibility now reflect this role.' })
  }

  function handleLogout() {
    logout()
    navigate('/login')
    toast.success('Signed out securely')
  }

  return (
    <header className="sticky top-0 z-30 flex h-17 items-center border-b border-border bg-background/90 px-3 backdrop-blur-xl sm:px-5 lg:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden" aria-label="Open navigation"><Menu /></Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{pageName}</p>
          <p className="hidden text-[11px] text-muted-foreground sm:block">Hayata Hotel & Suite · Central operations</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSearchClick}
        className="hidden h-9 w-[280px] items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm text-muted-foreground shadow-xs transition-colors hover:border-primary/30 hover:bg-muted/40 md:flex"
      >
        <Search className="size-4" />
        <span className="flex-1">Search everything…</span>
        <kbd className="flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold"><CommandIcon className="size-2.5" />K</kbd>
      </button>

      <div className="ml-2 flex items-center gap-1 sm:ml-3 sm:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onSearchClick} className="md:hidden" aria-label="Search"><Search /></Button>
          </TooltipTrigger>
          <TooltipContent>Search (⌘K)</TooltipContent>
        </Tooltip>

        <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={`${visibleAlerts.length} notifications`}>
                  <Bell />
                  {visibleAlerts.length > 0 && <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">{Math.min(visibleAlerts.length, 9)}</span>}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-[340px] p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div><p className="text-sm font-bold">Notifications</p><p className="text-[11px] text-muted-foreground">{visibleAlerts.length} require attention</p></div>
              <Badge variant="danger">Live</Badge>
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {visibleAlerts.slice(0, 5).map((alert) => (
                <button key={alert.id} type="button" onClick={() => { navigate('/inventory/alerts'); setNotificationOpen(false) }} className="flex w-full gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted">
                  <span className={cn('mt-1 size-2 shrink-0 rounded-full', alert.type === 'critical' ? 'bg-red-500' : 'bg-amber-500')} />
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{alert.itemName}</span><span className="mt-0.5 block text-xs text-muted-foreground">{alert.currentStock} remaining · reorder at {alert.threshold}</span></span>
                </button>
              ))}
              {!visibleAlerts.length && <p className="px-4 py-8 text-center text-sm text-muted-foreground">You’re all caught up.</p>}
            </div>
            <button type="button" onClick={() => { navigate('/inventory/alerts'); setNotificationOpen(false) }} className="w-full border-t border-border py-3 text-xs font-bold text-primary hover:bg-muted/50">View all alerts</button>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun /> : <Moon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
        </Tooltip>

        <div className="mx-1 hidden h-7 w-px bg-border sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-lg p-1 pr-1.5 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">
              <Avatar className="size-8"><AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-50 text-[11px] text-primary dark:from-teal-950 dark:to-cyan-950">{initials(user.name)}</AvatarFallback></Avatar>
              <span className="hidden text-left xl:block"><span className="block max-w-28 truncate text-xs font-bold leading-tight">{user.name}</span><span className="block max-w-28 truncate text-[10px] text-muted-foreground">{roleLabels[user.role]}</span></span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground xl:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Demo role preview</DropdownMenuLabel>
            {(Object.keys(roleLabels) as Role[]).map((role) => (
              <DropdownMenuItem key={role} onClick={() => handleRoleChange(role)}>
                <UserRound className={cn('size-4', role === user.role ? 'text-primary' : 'text-muted-foreground')} />
                <span className="flex-1">{roleLabels[role]}</span>
                {role === user.role && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}><Settings /> Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive"><LogOut /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
