import type { Metadata } from 'next'
import { Home } from '@/app/[locale]/page'
import { DEFAULT_LOCALE } from '@/lib/i18n/dictionary'
import { SITE_URL } from '@/lib/view/site'

/**
 * The site root, which serves the Indonesian home page rather than pointing at
 * it.
 *
 * This used to be `redirect('/id')`. A static export cannot redirect: Next
 * emitted an error shell carrying no meta refresh and no link to `/id`, so
 * nothing happened until React hydrated. A reader still got there; a crawler
 * got a dead end, and with no sitemap that left every page on the site
 * reachable only by someone who already knew its URL.
 *
 * Indonesian is the default (PRD §9), so the root shows the Indonesian page —
 * the same thing the redirect used to land on, one round trip sooner. The
 * canonical points at /id/ so the two URLs consolidate rather than compete.
 */
export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/${DEFAULT_LOCALE}` },
}

export default function RootPage() {
  return <Home locale={DEFAULT_LOCALE} />
}
