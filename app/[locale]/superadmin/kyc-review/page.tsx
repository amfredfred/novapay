// app/[locale]/superadmin/kyc-review/page.tsx
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/auth'
import { formatDateTime } from '@/lib/utils'
import { ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { KycDocsViewer } from '@/components/kyc-docs-viewer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'KYC Review · Superadmin' }
export const dynamic = 'force-dynamic'

async function approveKyc(userId: string) {
  'use server'
  const supabase = createAdminClient()
  await supabase.from('profiles').update({ kyc_status: 'verified', kyc_verified_at: new Date().toISOString() }).eq('id', userId)
  revalidatePath('/superadmin/kyc-review')
  revalidatePath(`/superadmin/users/${userId}`)
}

async function rejectKyc(userId: string) {
  'use server'
  const supabase = createAdminClient()
  await supabase.from('profiles').update({ kyc_status: 'rejected' }).eq('id', userId)
  revalidatePath('/superadmin/kyc-review')
  revalidatePath(`/superadmin/users/${userId}`)
}

export default async function SuperadminKycReviewPage() {
  await requireSuperadmin()
  const supabase = createAdminClient()

  const { data: pendingUsers } = await supabase
    .from('profiles')
    .select('id, full_name, email, kyc_status, created_at')
    .eq('kyc_status', 'pending')
    .order('created_at', { ascending: true })

  const userIds = (pendingUsers ?? []).map(u => u.id)
  const { data: allDocs } = userIds.length > 0
    ? await (supabase as any)
        .from('kyc_documents')
        .select('id, user_id, doc_type, status, storage_path, created_at')
        .in('user_id', userIds)
    : { data: [] }

  const docsByUser: Record<string, any[]> = {}
  for (const doc of (allDocs ?? [])) {
    if (!docsByUser[doc.user_id]) docsByUser[doc.user_id] = []
    docsByUser[doc.user_id]!.push(doc)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/superadmin/dashboard" className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">KYC Review</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(pendingUsers ?? []).length} submission{(pendingUsers ?? []).length !== 1 ? 's' : ''} pending review
          </p>
        </div>
      </div>

      {(pendingUsers ?? []).length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="font-semibold">All clear</p>
          <p className="text-sm text-muted-foreground mt-1">No KYC submissions pending review</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(pendingUsers ?? []).map(user => (
            <div key={user.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{user.full_name ?? 'Unnamed'}</p>
                      <Link href={`/superadmin/users/${user.id}`}
                        className="text-[10px] text-primary hover:underline">View full profile →</Link>
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted {formatDateTime(user.created_at)} · {docsByUser[user.id]?.length ?? 0} document{(docsByUser[user.id]?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <form action={rejectKyc.bind(null, user.id)}>
                    <button type="submit"
                      className="flex items-center gap-1.5 text-xs text-red-600 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </form>
                  <form action={approveKyc.bind(null, user.id)}>
                    <button type="submit"
                      className="flex items-center gap-1.5 text-xs text-white bg-green-600 px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                      <ShieldCheck className="h-3.5 w-3.5" /> Approve
                    </button>
                  </form>
                </div>
              </div>
              <div className="px-5 pb-5 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Submitted documents</p>
                <KycDocsViewer userId={user.id} docs={docsByUser[user.id] ?? []} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
