// lib/utils/index.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Currency } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Currency formatting ───────────────────────────────────────────────────────

const CURRENCY_LOCALES: Record<Currency, string> = {
  EUR: 'de-DE',
  USD: 'en-US',
  GBP: 'en-GB',
  CHF: 'de-CH',
  NGN: 'en-NG',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
}

export function formatCurrency(
  amount: number,
  currency: Currency,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    ...options,
  }).format(amount)
}

export function formatCurrencyCompact(amount: number, currency: Currency): string {
  return formatCurrency(amount, currency, {
    notation: 'compact',
    compactDisplay: 'short',
  })
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function formatDate(iso: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatDateTime(iso: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// ── Misc ──────────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function parseSearchParams<T extends Record<string, string | undefined>>(
  searchParams: Record<string, string | string[] | undefined>,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  ) as Partial<T>
}
