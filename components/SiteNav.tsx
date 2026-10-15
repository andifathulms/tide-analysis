'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Dictionary, Locale } from '@/lib/i18n/dictionary'
import { sectionOf, type SiteSection } from '@/lib/view/section'

/**
 * The masthead's three destinations. "Beranda" left the list: the lockup
 * beside it already goes home, and four links where three will do is one
 * more thing for a newcomer to read past.
 *
 * Client-side only for the active state — the layout that renders the
 * masthead has no pathname, and the links themselves work without script.
 */
export function SiteNav({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const pathname = usePathname()
  const active = sectionOf(pathname ?? '', process.env.NEXT_PUBLIC_BASE_PATH ?? '')

  const items: ReadonlyArray<{ key: Exclude<SiteSection, null>; href: string; label: string }> = [
    { key: 'stasiun', href: `/${locale}#stasiun`, label: dict.shell.stations },
    { key: 'pelajari', href: `/${locale}/resolusi`, label: dict.shell.learn },
    { key: 'metode', href: `/${locale}/metode`, label: dict.nav.metode },
  ]

  return (
    <ul className="flex items-center gap-0.5">
      {items.map((item) => {
        const current = item.key === active
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={current ? 'page' : undefined}
              className={`rounded-full px-3 py-1.5 transition-colors duration-150 ease-tide ${
                current ? 'bg-sunken font-semibold text-ink' : 'text-inkMuted hover:bg-sunken hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
