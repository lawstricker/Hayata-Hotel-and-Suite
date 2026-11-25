import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/input'
import { demoUsers } from '@/mock/data'
import { useAuthStore } from '@/store/authStore'
import { serverLogin } from '@/lib/auth-api'
import { AuthLayout } from './auth-layout'

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'elena@hayatahotel.com', password: 'demo123' },
  })

  async function onSubmit(values: LoginValues) {
    setSubmitting(true)
    setError('')
    try {
      await serverLogin(values.email, values.password)
      const user = await login(values.email, values.password)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`, { description: 'Signed in to Hayata HMS.' })
      navigate('/staff')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  function chooseDemo(email: string) {
    form.setValue('email', email, { shouldValidate: true })
    form.setValue('password', 'demo123')
  }

  return (
    <AuthLayout title="Welcome back" description="Sign in to continue to your hotel operations workspace.">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">{error}</div>}
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@hotel.com" aria-invalid={Boolean(form.formState.errors.email)} {...form.register('email')} />
          {form.formState.errors.email && <p className="text-xs font-medium text-destructive" role="alert">{form.formState.errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link to="/staff/forgot-password" className="text-xs font-bold text-primary hover:underline">Forgot password?</Link></div>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="pr-11" aria-invalid={Boolean(form.formState.errors.password)} {...form.register('password')} />
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          </div>
          {form.formState.errors.password && <p className="text-xs font-medium text-destructive" role="alert">{form.formState.errors.password.message}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? <><Loader2 className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight /></>}</Button>
      </form>

      <div className="my-7 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Demo accounts</span><span className="h-px flex-1 bg-border" /></div>
      <div className="grid grid-cols-2 gap-2">
        {demoUsers.slice(0, 4).map((user) => (
          <button key={user.id} type="button" onClick={() => chooseDemo(user.email)} className="rounded-lg border border-border bg-card px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-accent/40">
            <span className="block truncate text-xs font-bold">{user.name}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{user.role.replaceAll('_', ' ')}</span>
          </button>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">All demo accounts use password <span className="font-bold text-foreground">demo123</span></p>
    </AuthLayout>
  )
}
