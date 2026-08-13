import type { MetadataRoute } from 'next'
import { siteRoutes, SITE_URL } from '@/lib/view/site'

/**
 * Every page the export produces, from the same route list the canonicals use.
 *
 * The site had no sitemap and, until the root started serving content, no
 * crawlable path from its front door either — so all eighty-eight pages were
 * reachable only by someone who already knew the URL.
 *
 * Generated rather than written: a route added to the app appears here without
 * anyone remembering to add it, which is the only version of this file that
 * stays true.
 */
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, priority: 1 },
    ...siteRoutes().map((route) => ({
      url: route.url,
      // The station records are the substance; the locale landing pages and
      // the method page are how a reader gets to them.
      priority: route.path === '' ? 0.9 : route.path.includes('/') ? 0.6 : 0.8,
    })),
  ]
}
