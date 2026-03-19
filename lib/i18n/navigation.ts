// lib/i18n/navigation.ts
// Use these instead of next/navigation in all client components and server components
// They automatically prepend the current locale to every path

import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
