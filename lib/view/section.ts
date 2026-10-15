import { STATION_VIEWS } from '@/lib/view/stages'

/**
 * Which top-level destination a path belongs to, for the masthead's active
 * state. Pure, so the rule is tested rather than eyeballed: a station view is
 * Stasiun, the station-free resolution page is Pelajari, the method is Metode.
 */
export type SiteSection = 'stasiun' | 'pelajari' | 'metode' | null

export function sectionOf(pathname: string, basePath = ''): SiteSection {
  const path = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname
  const parts = path.split('/').filter((part) => part.length > 0)
  // parts[0] is the locale.
  const segment = parts[1]
  if (segment === undefined) return null
  if (segment === 'metode') return 'metode'
  if (segment === 'resolusi' && parts.length === 2) return 'pelajari'
  if ((STATION_VIEWS as readonly string[]).includes(segment)) return 'stasiun'
  return null
}
