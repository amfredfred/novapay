// app/[locale]/unauthorized/page.tsx
import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            <ShieldOff className="w-8 h-8 text-destructive" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your account does not have the superadmin role required to access this area.
            Contact your system administrator.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  )
}
