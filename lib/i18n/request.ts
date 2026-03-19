// lib/i18n/request.ts
// Referenced by next.config.ts → createNextIntlPlugin('./lib/i18n/request.ts')
import { getRequestConfig } from 'next-intl/server'
import { routing, type Locale } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = (await requestLocale) as string | undefined

  // Fall back to default locale if the incoming locale is missing or unknown
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default as Record<string, string>,
    timeZone: 'Europe/Berlin',
    now: new Date(),
  }
})
