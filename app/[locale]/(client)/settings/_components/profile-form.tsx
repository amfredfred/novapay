// app/[locale]/(client)/settings/_components/profile-form.tsx
'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { updateProfile } from '@/actions/client'

const schema = z.object({
  full_name:            z.string().min(2, 'Enter your full name').max(100),
  phone:                z.string().max(30).optional().or(z.literal('')),
  date_of_birth:        z.string().optional().or(z.literal('')),
  nationality:          z.string().length(2, 'Use 2-letter code e.g. DE').optional().or(z.literal('')),
  country_of_residence: z.string().length(2, 'Use 2-letter code e.g. GB').optional().or(z.literal('')),
})

type Values = z.infer<typeof schema>

interface Profile {
  id: string; email: string; full_name: string | null; phone: string | null
  date_of_birth: string | null; nationality: string | null; country_of_residence: string | null
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [isPending, start] = useTransition()
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name:            profile.full_name ?? '',
      phone:                profile.phone ?? '',
      date_of_birth:        profile.date_of_birth ?? '',
      nationality:          profile.nationality ?? '',
      country_of_residence: profile.country_of_residence ?? '',
    },
  })

  function onSubmit(values: Values) {
    start(async () => {
      try {
        const result = await updateProfile({
        full_name:            values.full_name || null,
        phone:                values.phone || null,
        date_of_birth:        values.date_of_birth || null,
        nationality:          values.nationality || null,
        country_of_residence: values.country_of_residence || null,
        })
        if (!result?.success) toast.error('Failed to save', { description: result?.error })
        else toast.success('Profile updated')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  const cls = 'w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Full name *</label>
          <input {...register('full_name')} className={cls} placeholder="Alice Schmidt" />
          {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Email</label>
          <input value={profile.email} disabled className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-muted-foreground bg-muted/50 cursor-not-allowed" />
          <p className="text-xs text-muted-foreground mt-1">Contact support to change email</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Phone</label>
          <input {...register('phone')} type="tel" placeholder="+44 7700 900000" className={cls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Date of birth</label>
          <input {...register('date_of_birth')} type="date" className={cls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Nationality</label>
          <input {...register('nationality')} maxLength={2} placeholder="DE" className={`${cls} uppercase font-mono`} />
          {errors.nationality && <p className="text-xs text-red-600 mt-1">{errors.nationality.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Country of residence</label>
          <input {...register('country_of_residence')} maxLength={2} placeholder="GB" className={`${cls} uppercase font-mono`} />
          {errors.country_of_residence && <p className="text-xs text-red-600 mt-1">{errors.country_of_residence.message}</p>}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isPending || !isDirty}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save changes</>}
        </button>
      </div>
    </form>
  )
}
