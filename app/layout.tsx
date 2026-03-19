// app/layout.tsx
// Root layout — minimal shell, all real layout is in app/[locale]/layout.tsx
import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
