'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { UserPlus, Loader2, Eye, EyeOff } from 'lucide-react'
import { adminCreateUser } from '@/actions/messages'

const schema = z.object({
  fullName: z.string().min(2, 'Enter full name'),
  email:    z.string().email('Enter valid email'),
  password: z.string().min(8, 'Min 8 characters'),
})
type FormValues = z.infer<typeof schema>

export function CreateUserForm() {
  const router            = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [isPending, start]  = useTransition()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const cls = 'w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors'

  function onSubmit(values: FormValues) {
    start(async () => {
      try {
        const result = await adminCreateUser(values)
        if (!result?.success) { toast.error(result?.error); return }
        toast.success('User created and assigned to you')
        router.push('/admin/customers')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
      }
    })
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Full name</label>
        <input {...register('fullName')} className={cls} placeholder="Alice Smith" />
        {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Email</label>
        <input {...register('email')} type="email" className={cls} placeholder="alice@example.com" />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Temporary password</label>
        <div className="relative">
          <input {...register('password')} type={showPw ? 'text' : 'password'} className={`${cls} pr-10`} placeholder="••••••••" />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
      </div>
      <button
        onClick={handleSubmit(onSubmit)}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        Create user
      </button>
    </div>
  )
}
