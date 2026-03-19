// app/[locale]/(client)/dashboard/_components/balance-toggle.tsx
'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/types'

interface Props {
  value:    number
  currency: Currency
}

export function BalanceToggle({ value, currency }: Props) {
  const [visible, setVisible] = useState(true)

  return (
    <div className="flex items-center gap-3">
      <span className="text-4xl font-bold tabular-nums tracking-tight">
        {visible ? formatCurrency(value, currency) : '••••••'}
      </span>
      <button
        onClick={() => setVisible((v) => !v)}
        className="p-1.5 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-card/10"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
