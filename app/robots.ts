import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/view/site'

/**
 * Nothing here is private and nothing is behind a query string, so everything
 * is crawlable. The file exists to carry the sitemap reference.
 */
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
