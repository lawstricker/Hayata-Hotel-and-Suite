import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Crown, Plus, Search, Sparkles, Star, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/common/status-pill'
import { guests as seedGuests } from '@/mock/data'
import { cn, downloadCsv, formatCurrency, formatDate, initials } from '@/lib/utils'
import type { Guest } from '@/types/domain'

const guestSchema = z.object({ firstName: z.string().min(2, 'Enter first name'), lastName: z.string().min(2, 'Enter last name'), email: z.email('Enter a valid email'), phone: z.string().min(7, 'Enter a phone number'), nationality: z.string().min(2, 'Enter nationality'), segment: z.enum(['VIP', 'Repeat', 'Corporate', 'Blacklisted', 'Regular']) })
type GuestValues = z.infer<typeof guestSchema>

function AddGuestDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (open: boolean) => void; onAdd: (guest: Guest) => void }) {
  const form = useForm<GuestValues>({ resolver: zodResolver(guestSchema), defaultValues: { segment: 'Regular', nationality: 'United States' } })
  function submit(values: GuestValues) {
    onAdd({ id: `guest-new-${Date.now()}`, ...values, lifecycle: 'Lead', tier: 'Bronze', points: 0, spendTotal: 0, openBalance: 0, stays: 0, lastStay: new Date().toISOString(), preferences: [], notes: 'Profile created by front desk.', createdAt: new Date().toISOString() })
    toast.success('Guest profile created', { description: `${values.firstName} ${values.lastName}` })
    onOpenChange(false)
    form.reset()
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Add guest profile</DialogTitle><DialogDescription>Create a guest record for a new or walk-in stay.</DialogDescription></DialogHeader><form onSubmit={form.handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>First name</Label><Input {...form.register('firstName')} /></div><div className="space-y-1.5"><Label>Last name</Label><Input {...form.register('lastName')} /></div><div className="space-y-1.5 sm:col-span-2"><Label>Email</Label><Input type="email" {...form.register('email')} /></div><div className="space-y-1.5"><Label>Phone</Label><Input {...form.register('phone')} /></div><div className="space-y-1.5"><Label>Nationality</Label><Input {...form.register('nationality')} /></div><div className="space-y-1.5 sm:col-span-2"><Label>Segment</Label><select {...form.register('segment')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>Regular</option><option>VIP</option><option>Repeat</option><option>Corporate</option><option>Blacklisted</option></select></div><div className="sm:col-span-2"><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit"><UserPlus /> Create profile</Button></DialogFooter></div></form></DialogContent></Dialog>
}

export function GuestsPage() {
  const [guestList, setGuestList] = useState(seedGuests)
  const [segment, setSegment] = useState('all')
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => guestList.filter((guest) => segment === 'all' || guest.segment === segment), [guestList, segment])
  const columns: DataTableColumn<Guest>[] = [
    { key: 'firstName', header: 'Guest', sortable: true, cell: (row) => <div className="flex min-w-[210px] items-center gap-3"><Avatar className="size-9"><AvatarFallback>{initials(`${row.firstName} ${row.lastName}`)}</AvatarFallback></Avatar><div><p className="font-bold">{row.firstName} {row.lastName}</p><p className="text-[10px] text-muted-foreground">{row.email}</p></div></div> },
    { key: 'segment', header: 'Segment', cell: (row) => <StatusPill status={row.segment} /> },
    { key: 'tier', header: 'Tier', cell: (row) => <StatusPill status={row.tier} /> },
    { key: 'stays', header: 'Stays', align: 'right', sortable: true, cell: (row) => <span className="text-xs font-bold">{row.stays}</span> },
    { key: 'spendTotal', header: 'Lifetime spend', align: 'right', sortable: true, cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.spendTotal)}</span> },
    { key: 'openBalance', header: 'Balance', align: 'right', cell: (row) => <span className={cn('text-xs font-bold', row.openBalance > 0 && 'text-red-600')}>{formatCurrency(row.openBalance)}</span> },
    { key: 'lastStay', header: 'Last stay', hideOnMobile: true, cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.lastStay)}</span> },
    { key: 'actions', header: '', align: 'right', cell: (row) => <Button asChild size="sm" variant="ghost"><Link to={`/staff/guests/${row.id}`}>View <ArrowRight /></Link></Button> },
  ]
  return <div className="space-y-6"><PageHeader title="Guest directory" description="A unified view of guest relationships, value and preferences." breadcrumbs={[{ label: 'Guests & CRM' }, { label: 'Guest directory' }]} actions={<><Button variant="outline" onClick={() => { downloadCsv('guest-directory.csv', filtered.map((guest) => ({ name: `${guest.firstName} ${guest.lastName}`, email: guest.email, phone: guest.phone, segment: guest.segment, tier: guest.tier, stays: guest.stays, spend: guest.spendTotal, balance: guest.openBalance }))); toast.success('Guest list exported', { description: `${filtered.length} profiles written to CSV` }) }}><Search /> Export</Button><Button onClick={() => setOpen(true)}><Plus /> Add guest</Button></>} /><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Card className="p-4"><Users className="size-4 text-primary" /><p className="mt-2 font-display text-2xl font-extrabold">{guestList.length}</p><p className="text-xs text-muted-foreground">Total profiles</p></Card><Card className="p-4"><Crown className="size-4 text-violet-500" /><p className="mt-2 font-display text-2xl font-extrabold">{guestList.filter((guest) => guest.segment === 'VIP').length}</p><p className="text-xs text-muted-foreground">VIP guests</p></Card><Card className="p-4"><Sparkles className="size-4 text-amber-500" /><p className="mt-2 font-display text-2xl font-extrabold">{guestList.filter((guest) => guest.segment === 'Repeat').length}</p><p className="text-xs text-muted-foreground">Repeat guests</p></Card><Card className="p-4"><Star className="size-4 text-blue-500" /><p className="mt-2 font-display text-2xl font-extrabold">{guestList.filter((guest) => guest.tier === 'Gold' || guest.tier === 'Platinum').length}</p><p className="text-xs text-muted-foreground">Gold & Platinum</p></Card></div><Card><CardContent className="pt-5"><DataTable data={filtered} columns={columns} searchPlaceholder="Search name, email, phone…" searchKeys={[(row) => `${row.firstName} ${row.lastName}`, (row) => row.email, (row) => row.phone, (row) => row.company ?? '']} pageSize={10} filename="guest-directory.csv" selectable toolbar={<select value={segment} onChange={(event) => setSegment(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="all">All segments</option>{['VIP', 'Repeat', 'Corporate', 'Blacklisted', 'Regular'].map((option) => <option key={option}>{option}</option>)}</select>} /></CardContent></Card><AddGuestDialog open={open} onOpenChange={setOpen} onAdd={(guest) => setGuestList((current) => [guest, ...current])} /></div>
}
