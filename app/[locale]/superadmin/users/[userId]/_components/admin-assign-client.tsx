// app/[locale]/superadmin/users/[userId]/_components/admin-assign-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { UserCheck, UserX, Loader2, Shield } from 'lucide-react'
import { assignUsersToAdmin, unassignUserFromAdmin } from '@/actions/admin-assignments'

interface Admin { id: string; email: string; full_name: string | null }

interface Props {
  userId:           string
  admins:           Admin[]
  assignedAdminIds: string[]
}

export function AdminAssignClient({ userId, admins, assignedAdminIds: initial }: Props) {
  const [assigned, setAssigned]  = useState<Set<string>>(new Set(initial))
  const [isPending, start]       = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  function toggle(adminId: string) {
    setLoadingId(adminId)
    const isAssigned = assigned.has(adminId)
    start(async () => {
      try {
        const result = isAssigned
        ? await unassignUserFromAdmin(adminId, userId)
        : await assignUsersToAdmin({ adminId, userIds: [userId] })

        if (!result?.success) {
        toast.error(result?.error)
        } else {
        setAssigned(prev => {
          const next = new Set(prev)
          isAssigned ? next.delete(adminId) : next.add(adminId)
          return next
        })
        toast.success(isAssigned ? 'Admin unassigned' : 'Admin assigned')
        }
        setLoadingId(null)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Assigned admins</h3>
        <span className="text-xs text-muted-foreground ml-1">
          · {assigned.size} admin{assigned.size !== 1 ? 's' : ''} can see this user
        </span>
      </div>

      {admins.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No admin accounts exist yet. Create an admin user first.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {admins.map(admin => {
            const isAssigned = assigned.has(admin.id)
            const isLoading  = loadingId === admin.id && isPending
            return (
              <div key={admin.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isAssigned ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {(admin.full_name ?? admin.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{admin.full_name ?? 'Unnamed admin'}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(admin.id)}
                  disabled={isLoading}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    isAssigned
                      ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                      : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                  }`}
                >
                  {isLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : isAssigned
                      ? <><UserX className="h-3.5 w-3.5" /> Unassign</>
                      : <><UserCheck className="h-3.5 w-3.5" /> Assign</>
                  }
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
