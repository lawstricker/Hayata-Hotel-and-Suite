import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { AuthLayout } from './auth-layout'

const schema = z.object({ email: z.email('Enter a valid email address') })
type Values = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: 'elena@hayatahotel.com' } })
  return (
    <AuthLayout title="Reset your password" description="Enter your work email and we’ll send a secure reset link.">
      {sent ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
          <h3 className="mt-4 font-display text-lg font-bold">Check your inbox</h3>
          <p className="mt-2 text-sm text-muted-foreground">We sent password reset instructions to <span className="font-semibold text-foreground">{form.getValues('email')}</span>.</p>
          <Button asChild variant="outline" className="mt-6"><Link to="/staff/login"><ArrowLeft /> Back to sign in</Link></Button>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(() => setSent(true))} className="space-y-5" noValidate>
          <div className="space-y-2"><Label htmlFor="email">Work email</Label><Input id="email" type="email" autoComplete="email" {...form.register('email')} />{form.formState.errors.email && <p className="text-xs font-medium text-destructive">{form.formState.errors.email.message}</p>}</div>
          <Button type="submit" size="lg" className="w-full">Send reset link <ArrowRight /></Button>
          <Button asChild variant="ghost" className="w-full"><Link to="/staff/login"><ArrowLeft /> Back to sign in</Link></Button>
        </form>
      )}
    </AuthLayout>
  )
}
