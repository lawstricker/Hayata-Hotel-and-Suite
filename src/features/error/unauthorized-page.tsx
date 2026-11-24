import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { roleLabels } from '@/lib/rbac'

export function UnauthorizedPage() {
  const role = useAuthStore((state) => state.user?.role)
  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center">
      <Card className="max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"><LockKeyhole className="size-6" /></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-red-600">403 · Unauthorized</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">This area is restricted</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Your current role, <span className="font-bold text-foreground">{role ? roleLabels[role] : 'Guest'}</span>, does not have permission to view this module. Switch roles from the top menu or contact an administrator.</p>
        <div className="mt-7 flex justify-center gap-2"><Button asChild variant="outline"><Link to="/"><ArrowLeft /> Back to dashboard</Link></Button></div>
      </Card>
    </div>
  )
}
