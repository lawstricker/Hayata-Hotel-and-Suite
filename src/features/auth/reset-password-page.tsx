import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { AuthLayout } from './auth-layout'

const schema = z.object({
  password: z.string().min(8, 'Use at least 8 characters'),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })
type Values = z.infer<typeof schema>

export function ResetPasswordPage() {
  const [complete, setComplete] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', confirmPassword: '' } })
  return (
    <AuthLayout title="Choose a new password" description="Use a strong, unique password for your Hayata account.">
      {complete ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" /><h3 className="mt-4 font-display text-lg font-bold">Password updated</h3><p className="mt-2 text-sm text-muted-foreground">Your password has been changed securely.</p><Button asChild className="mt-6"><Link to="/login">Continue to sign in <ArrowRight /></Link></Button>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(() => setComplete(true))} className="space-y-5" noValidate>
          <div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />{form.formState.errors.password && <p className="text-xs font-medium text-destructive">{form.formState.errors.password.message}</p>}</div>
          <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm password</Label><Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register('confirmPassword')} />{form.formState.errors.confirmPassword && <p className="text-xs font-medium text-destructive">{form.formState.errors.confirmPassword.message}</p>}</div>
          <Button type="submit" size="lg" className="w-full">Update password <ArrowRight /></Button>
        </form>
      )}
    </AuthLayout>
  )
}
