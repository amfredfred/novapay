// components/kyc-docs-viewer.tsx
// Server component — generates signed URLs for KYC documents and renders them
import { createAdminClient } from '@/lib/supabase/server'
import { FileText, Download, ExternalLink, Clock, CheckCircle2, XCircle, ImageOff } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const DOC_LABELS: Record<string, string> = {
  passport:         'Passport',
  national_id:      'National ID',
  driving_licence:  "Driver's Licence",
  proof_of_address: 'Proof of Address',
}

const STATUS_STYLES: Record<string, { color: string; Icon: any }> = {
  pending:  { color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',  Icon: Clock },
  approved: { color: 'text-green-600 bg-green-500/10 border-green-500/20',  Icon: CheckCircle2 },
  rejected: { color: 'text-red-600   bg-red-500/10   border-red-500/20',    Icon: XCircle },
}

interface KycDoc {
  id:           string
  doc_type:     string
  status:       string
  storage_path: string | null
  created_at:   string
}

interface Props {
  userId:   string
  docs:     KycDoc[]
  compact?: boolean
}

export async function KycDocsViewer({ userId, docs, compact }: Props) {
  if (!docs || docs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <ImageOff className="h-4 w-4 shrink-0" />
        No documents uploaded yet
      </div>
    )
  }

  const supabase  = createAdminClient()
  // Generate 1-hour signed URLs for each doc
  const docsWithUrls = await Promise.all(
    docs.map(async (doc) => {
      if (!doc.storage_path) return { ...doc, signedUrl: null }
      const { data } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(doc.storage_path, 3600)
      return { ...doc, signedUrl: data?.signedUrl ?? null }
    })
  )

  const isImage = (path: string | null) =>
    path && /\.(jpg|jpeg|png|webp)$/i.test(path)

  if (compact) {
    // Compact inline list for KYC review page
    return (
      <div className="space-y-2 mt-3">
        {docsWithUrls.map(doc => {
          const cfg = STATUS_STYLES[doc.status] ?? STATUS_STYLES['pending']!
          const Icon = cfg.Icon
          return (
            <div key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{DOC_LABELS[doc.doc_type] ?? doc.doc_type}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(doc.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${cfg.color}`}>
                  <Icon className="h-2.5 w-2.5" />
                  {doc.status}
                </span>
                {doc.signedUrl && (
                  <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary border border-primary/20 bg-primary/10 px-2.5 py-1 rounded-lg hover:bg-primary/20 transition-colors">
                    <ExternalLink className="h-3 w-3" />
                    View
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Full card view for user detail pages
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {docsWithUrls.map(doc => {
        const cfg     = STATUS_STYLES[doc.status] ?? STATUS_STYLES['pending']!
        const Icon    = cfg.Icon
        const imgPath = isImage(doc.storage_path)
        return (
          <div key={doc.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Preview */}
            <div className="relative bg-muted h-40 flex items-center justify-center">
              {doc.signedUrl && imgPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={doc.signedUrl}
                  alt={DOC_LABELS[doc.doc_type] ?? doc.doc_type}
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : doc.signedUrl ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="h-10 w-10" />
                  <p className="text-xs">PDF document</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageOff className="h-8 w-8" />
                  <p className="text-xs">No file</p>
                </div>
              )}
            </div>

            {/* Info + actions */}
            <div className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-foreground">{DOC_LABELS[doc.doc_type] ?? doc.doc_type}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${cfg.color}`}>
                  <Icon className="h-2.5 w-2.5" />
                  {doc.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{formatDateTime(doc.created_at)}</p>
              {doc.signedUrl && (
                <a
                  href={doc.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-primary border border-primary/20 bg-primary/5 py-2 rounded-lg hover:bg-primary/15 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open full document
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
