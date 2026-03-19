// app/[locale]/maintenance/page.tsx
import { ShieldCheck, Wrench } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
        <Wrench className="w-8 h-8 text-amber-600" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">We're under maintenance</h1>
      <p className="text-muted-foreground max-w-sm mb-8">
        NovaPay is currently undergoing scheduled maintenance. We'll be back shortly.
        Your funds and data are safe.
      </p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-green-500" />
        Your money is protected and FSCS insured
      </div>
    </div>
  )
}
