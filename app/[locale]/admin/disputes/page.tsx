// app/[locale]/(admin)/disputes/page.tsx
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin, getAdminScope } from '@/lib/auth/client'
import { formatDateTime } from '@/lib/utils'
import { MessageSquare, Clock, CheckCircle2 } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import type { Dispute } from '@/types/supabase'

export const metadata: Metadata = { title: 'Disputes · Admin' }
export const dynamic = 'force-dynamic'

async function updateDisputeStatus(disputeId: string, status: string) {
  'use server'
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('disputes').update({ status, updated_at: new Date().toISOString() }).eq('id', disputeId)
  revalidatePath('/admin/disputes')
}

const STATUS_COLORS: Record<string, string> = {
  open:          'bg-primary/10 text-primary border-primary/20',
  under_review:  'bg-amber-50 text-amber-700 border-amber-200',
  resolved:      'bg-green-500/10 text-green-600 border-green-500/20',
  closed:        'bg-muted text-muted-foreground border-border',
}

export default async function AdminDisputesPage() {
  const admin = await requireAdmin()
  const role  = admin.app_metadata?.['role'] as string
  const scope = await getAdminScope(admin.id, role)

  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('disputes')
    .select('*')
    .order('created_at', { ascending: false })

  if (scope !== 'all') {
    if (scope.length === 0) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold mb-2">Disputes</h1>
          <div className="rounded-xl border-2 border-dashed border-border p-16 text-center text-muted-foreground">
            <p className="font-semibold">No users assigned yet</p>
            <p className="text-sm mt-1">Ask your superadmin to assign users to your account</p>
          </div>
        </div>
      )
    }
    query = query.in('user_id', scope)
  }

  const { data: disputes } = await query

  const open = (disputes ?? []).filter((d: Dispute) => d.status === 'open' || d.status === 'under_review').length

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Disputes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {open} open{scope !== 'all' ? ' from your assigned users' : ''}
        </p>
      </div>

      {(disputes ?? []).length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="font-semibold">No disputes</p>
          <p className="text-sm text-muted-foreground mt-1">No disputes to review right now</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(disputes as Dispute[]).map(d => (
            <div key={d.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm capitalize">{(d as unknown as Record<string,string | undefined>)['dispute_type']?.replace(/_/g, ' ') ?? 'Dispute'}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(d.created_at)}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[d.status] ?? ''}`}>
                  {d.status.replace(/_/g, ' ')}
                </span>
              </div>
              {d.description && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{d.description}</p>}
              {(d.status === 'open' || d.status === 'under_review') && (
                <div className="flex gap-2 pt-3 border-t border-border">
                  <form action={updateDisputeStatus.bind(null, d.id, 'under_review')}>
                    <button type="submit"
                      className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors">
                      <Clock className="h-3.5 w-3.5" /> Under review
                    </button>
                  </form>
                  <form action={updateDisputeStatus.bind(null, d.id, 'resolved')}>
                    <button type="submit"
                      className="flex items-center gap-1.5 text-xs text-white bg-green-600 px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
