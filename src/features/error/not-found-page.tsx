import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center">
      <Card className="max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Compass className="size-6" /></div>
        <p className="mt-5 font-display text-5xl font-extrabold tracking-tight text-primary">404</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">The page you’re looking for doesn’t exist or has moved.</p>
        <Button asChild className="mt-7"><Link to="/"><ArrowLeft /> Return to dashboard</Link></Button>
      </Card>
    </div>
  )
}
