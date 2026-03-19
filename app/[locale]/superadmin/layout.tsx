// app/[locale]/(superadmin)/layout.tsx
import type { ReactNode } from 'react'
import { requireSuperadmin } from '@/lib/auth'
import { Sidebar } from './_components/sidebar'
import { Topbar } from './_components/topbar'

interface Props {
  children: ReactNode
}

export default async function SuperadminLayout({ children }: Props) {
  // Belt-and-suspenders: middleware already checked, but RSC re-verifies
  const { user } = await requireSuperadmin()

  return (
    <div className="superadmin-shell dark flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar adminEmail={user.email ?? ''} adminId={user.id} />
        <main className="flex-1 overflow-y-auto bg-muted/30 focus-visible:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}
