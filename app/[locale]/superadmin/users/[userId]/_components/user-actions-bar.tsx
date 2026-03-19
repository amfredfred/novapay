// app/[locale]/(superadmin)/users/[userId]/_components/user-actions-bar.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserX, UserCheck, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { suspendUser, unsuspendUser, resetTwoFactor } from '@/actions/superadmin'
import type { AccountStatus } from '@/types'

interface Props {
  userId:        string
  accountStatus: AccountStatus
}

export function UserActionsBar({ userId, accountStatus }: Props) {
  const router = useRouter()
  const [isPending, start] = useTransition()

  function handleAction(action: () => Promise<{ success: boolean; error?: string }>, label: string) {
    start(async () => {
      const result = await action()
      if (!result.success) {
        toast.error(`${label} failed`, { description: result.error })
        return
      }
      toast.success(label)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        className="gap-1.5"
        onClick={() =>
          handleAction(() => resetTwoFactor(userId), '2FA reset — recovery email sent')
        }
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        Reset 2FA
      </Button>

      {accountStatus === 'active' ? (
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          className="gap-1.5"
          onClick={() => handleAction(() => suspendUser(userId), 'Account suspended')}
        >
          <UserX className="h-3.5 w-3.5" /> Suspend
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className="gap-1.5"
          onClick={() => handleAction(() => unsuspendUser(userId), 'Account unsuspended')}
        >
          <UserCheck className="h-3.5 w-3.5" /> Unsuspend
        </Button>
      )}
    </div>
  )
}
