/**
 * Where the site lives, and the routes it publishes.
 *
 * One list, read by the metadata on every page, by the sitemap and by robots —
 * so a route cannot be added to the app and quietly left out of the things
 * that make it findable.
 */

import { LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations } from '@/lib/records/registry'

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://andifathulms.github.io/tide-analysis/'
).replace(/\/$/, '')

/** Views that exist once per station. */
export const STATION_VIEWS = ['catatan', 'komponen', 'resolusi', 'banding', 'prediksi'] as const

/** Views that exist once per locale. */
export const LOCALE_VIEWS = ['', 'metode', 'resolusi'] as const

export interface SiteRoute {
  readonly locale: Locale
  /** Path below the locale, '' for the locale home page. */
  readonly path: string
  readonly url: string
}

/** Every page the export produces, apart from the root and 404. */
export function siteRoutes(): SiteRoute[] {
  const routes: SiteRoute[] = []
  const list = stations()

  for (const locale of LOCALES) {
    for (const view of LOCALE_VIEWS) {
      routes.push({ locale, path: view, url: absolute(locale, view) })
    }
    for (const view of STATION_VIEWS) {
      for (const station of list) {
        const path = `${view}/${station.stationId}`
        routes.push({ locale, path, url: absolute(locale, path) })
      }
    }
  }

  return routes
}

export function absolute(locale: Locale, path: string): string {
  return path === '' ? `${SITE_URL}/${locale}` : `${SITE_URL}/${locale}/${path}`
}
