// app/[locale]/(superadmin)/error.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  error:  Error & { digest?: string }
  reset:  () => void
}

export default function SuperadminError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[SuperadminError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {error.message ?? 'An unexpected error occurred in the superadmin panel.'}
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-muted-foreground mt-2">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
