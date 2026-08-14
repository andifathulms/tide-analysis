import type { Metadata } from 'next'
import LocaleLayout from '@/app/[locale]/layout'
import { Home } from '@/app/[locale]/page'
import { dictionary, DEFAULT_LOCALE } from '@/lib/i18n/dictionary'
import { pageMetadata } from '@/lib/view/metadata'

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
const dict = dictionary(DEFAULT_LOCALE)

/*
 * The title carries the site name explicitly. Next applies a title template to
 * the children of the segment that defines it, and this page is that segment's
 * own page — so the root layout's '%s · Tide Analysis' never reaches it, and /
 * ended up titled differently from the /id/ it is a copy of. The site name
 * comes from the dictionary, the same place the masthead wordmark reads it.
 */
export const metadata: Metadata = {
  ...pageMetadata({
    locale: DEFAULT_LOCALE,
    path: '',
    title: dict.home.heroTitle,
    description: dict.home.heroLead,
  }),
  title: { absolute: `${dict.home.heroTitle} · ${dict.siteName}` },
}

/*
 * The locale layout is applied explicitly.
 *
 * app/page.tsx sits above the [locale] segment, so it inherits only the root
 * layout — html and body. Rendering the home page here without saying so cost
 * it the masthead, the <main> landmark, the footer, the skip link and the lang
 * wrapper: the front door quietly lost two accessibility fixes and the site
 * chrome. Wrapping in the same layout the locale routes use is what makes /
 * and /id/ the same page rather than merely similar ones.
 */
export default function RootPage() {
  return (
    <LocaleLayout params={{ locale: DEFAULT_LOCALE }}>
      <Home locale={DEFAULT_LOCALE} />
    </LocaleLayout>
  )
}
