// app/[locale]/(client)/kyc/kyc-client.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, XCircle, Upload, ShieldCheck,
  FileText, Home, Car, Loader2, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadKycDocument, submitKycForReview } from '@/actions/client'

const DOCS = [
  { type: 'passport',         label: 'Passport',          Icon: FileText,    desc: 'All pages including photo page' },
  { type: 'national_id',      label: 'National ID',        Icon: ShieldCheck, desc: 'Front and back' },
  { type: 'driving_licence',  label: "Driver's licence",   Icon: Car,         desc: 'Front and back' },
  { type: 'proof_of_address', label: 'Proof of address',   Icon: Home,        desc: 'Utility bill or bank statement (under 3 months)' },
] as const

interface Props {
  userId:         string
  kycStatus:      string
  submittedTypes: string[]
}

export function KycClient({ userId, kycStatus, submittedTypes: initial }: Props) {
  const router = useRouter()
  const [submitted, setSubmitted] = useState<Set<string>>(new Set(initial))
  const [uploading, setUploading] = useState<string | null>(null)
  const [isPending, start]        = useTransition()

  const statusConfig = {
    not_started: { label: 'Not started',  color: 'gray',  Icon: Upload },
    pending:     { label: 'Under review', color: 'amber', Icon: Clock },
    verified:    { label: 'Verified',     color: 'green', Icon: CheckCircle2 },
    rejected:    { label: 'Rejected',     color: 'red',   Icon: XCircle },
  }[kycStatus] ?? { label: 'Unknown', color: 'gray', Icon: Upload }

  const StatusIcon = statusConfig.Icon

  async function handleFileChange(type: string, file: File | null) {
    if (!file) return
    setUploading(type)
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      // Convert file to base64 to pass through server action
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res((reader.result as string).split(',')[1] ?? '')
        reader.onerror = () => rej(reader.error)
        reader.readAsDataURL(file)
      })
      const result = await uploadKycDocument({
        docType:    type as 'passport' | 'national_id' | 'driving_licence' | 'proof_of_address',
        fileBase64: base64,
        mimeType:   file.type,
        ext,
      })
      if (!result?.success) throw new Error(result?.error)
      setSubmitted(prev => new Set([...prev, type]))
      toast.success(`${type.replace(/_/g, ' ')} uploaded`)
    } catch (err) {
      toast.error('Upload failed', { description: (err as Error).message })
    } finally {
      setUploading(null)
    }
  }

  function submitForReview() {
    if (submitted.size === 0) { toast.error('Upload at least one document first'); return }
    start(async () => {
      try {
        const result = await submitKycForReview()
        if (!result?.success) {
          toast.error('Submission failed', { description: result?.error })
          return
        }
        toast.success('Documents submitted for review', {
          description: 'We typically review within 24 hours',
        })
        router.refresh()
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err?.message ?? 'Submission failed. Please try again.')
      }
    })
  }

  const statusBg = {
    green: 'bg-green-500/10 border-green-500/20',
    amber: 'bg-amber-50 border-amber-200',
    red:   'bg-red-50 border-red-200',
    gray:  'bg-muted/50 border-border',
  }[statusConfig.color]

  const statusText = {
    green: 'text-green-700',
    amber: 'text-amber-700',
    red:   'text-red-700',
    gray:  'text-muted-foreground',
  }[statusConfig.color]

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Identity verification</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Verify your identity to unlock higher limits and all features</p>
      </div>

      {/* Status card */}
      <div className={`rounded-2xl border p-5 ${statusBg}`}>
        <div className="flex items-center gap-3 mb-2">
          <StatusIcon className={`w-5 h-5 ${statusText}`} />
          <span className={`font-semibold ${statusText}`}>{statusConfig.label}</span>
        </div>
        {kycStatus === 'not_started' && (
          <p className={`text-sm ${statusText}`}>Upload your documents below to start. We typically review within 24 hours.</p>
        )}
        {kycStatus === 'pending' && (
          <p className={`text-sm ${statusText}`}>Your documents are being reviewed by our compliance team. This usually takes 1–24 hours.</p>
        )}
        {kycStatus === 'verified' && (
          <p className={`text-sm ${statusText}`}>Your identity has been verified. You have access to all features and the highest transaction limits.</p>
        )}
        {kycStatus === 'rejected' && (
          <p className={`text-sm ${statusText}`}>
            Your verification was rejected. Please re-upload clear, valid documents and resubmit.
          </p>
        )}
      </div>

      {/* Unlock benefits */}
      {kycStatus !== 'verified' && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="font-semibold text-foreground mb-4">What you unlock after verification</h2>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {[
              '€10k → €50k monthly limit',
              'International wire transfers',
              'Physical card delivery',
              'NovaSave savings account',
              'Business account upgrade',
              'Priority customer support',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document upload */}
      {kycStatus !== 'verified' && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Upload documents</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Upload a government-issued ID and proof of address</p>
          </div>
          <div className="divide-y divide-border">
            {DOCS.map(({ type, label, Icon, desc }) => {
              const isSubmitted = submitted.has(type)
              const isUploading = uploading === type
              return (
                <div key={type} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSubmitted ? 'bg-green-500/10' : 'bg-muted'}`}>
                    {isSubmitted
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : <Icon className="w-5 h-5 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {isSubmitted ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-green-600 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                        Uploaded
                      </span>
                      {kycStatus !== 'pending' && (
                        <label className="text-xs text-muted-foreground hover:text-muted-foreground cursor-pointer underline">
                          Replace
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={e => handleFileChange(type, e.target.files?.[0] ?? null)}
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <label className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
                      isUploading
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'text-primary bg-primary/10 border border-primary/30 hover:bg-primary/15'
                    }`}>
                      {isUploading
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</>
                        : <><Upload className="w-3 h-3" /> Upload</>
                      }
                      {!isUploading && (
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={e => handleFileChange(type, e.target.files?.[0] ?? null)}
                        />
                      )}
                    </label>
                  )}
                </div>
              )
            })}
          </div>

          {submitted.size > 0 && kycStatus !== 'pending' && (
            <div className="p-5 border-t border-border">
              {submitted.size < 2 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  We recommend uploading both an ID document and proof of address for faster approval
                </div>
              )}
              <button
                onClick={submitForReview}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  : `Submit ${submitted.size} document${submitted.size !== 1 ? 's' : ''} for review`
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
