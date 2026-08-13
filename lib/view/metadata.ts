/**
 * Per-page metadata, assembled from the strings the page itself renders.
 *
 * Every one of the eighty-nine exported pages carried the same title, the same
 * description and the same social card. A link to Benoa's record, to the method
 * page and to the separation ladder all previewed identically, the English
 * pages advertised an Indonesian description, and a search engine saw
 * eighty-nine duplicate titles with nothing to say which were translations of
 * which.
 *
 * The rule this follows: a page's title and description are the page's own
 * heading and lead, read from the same dictionary entry the markup reads. A
 * description written separately is a description that drifts, and one that
 * has drifted is worse than none.
 */

import type { Metadata } from 'next'
import { LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { absolute, SITE_URL } from './site'

/**
 * Roughly what a search result will show before truncating. Cutting on a word
 * boundary here is derivation from the page's lead, not a second copy of it.
 */
const DESCRIPTION_LIMIT = 165

function trim(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= DESCRIPTION_LIMIT) return flat
  const cut = flat.slice(0, DESCRIPTION_LIMIT)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length).replace(/[,;:—-]$/, '')}…`
}

export interface PageMetadataOptions {
  readonly locale: Locale
  /** Path below the locale; '' for the locale's home page. */
  readonly path: string
  /** The page's own heading. */
  readonly title: string
  /** The page's own lead paragraph. */
  readonly description: string
}

export function pageMetadata(options: PageMetadataOptions): Metadata {
  const { locale, path, title } = options
  const description = trim(options.description)
  const url = absolute(locale, path)

  /*
   * hreflang wants every translation of this page including itself, plus an
   * x-default. The two locales share a path, which is what makes the pairing
   * expressible at all.
   */
  const languages: Record<string, string> = {}
  for (const other of LOCALES) languages[other] = absolute(other, path)
  languages['x-default'] = absolute('id', path)

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: 'website',
      siteName: 'Tide Analysis',
      locale: locale === 'id' ? 'id_ID' : 'en_GB',
      url,
      title,
      description,
      /*
       * One card for the whole site. Generating a card per page would mean an
       * image pipeline, and the only honest per-page card would have to render
       * that station's chart — a real improvement, and a new dependency, so
       * not this pass.
       */
      images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/og.png`],
    },
  }
}
