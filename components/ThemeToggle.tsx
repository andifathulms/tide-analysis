'use client'

import { useEffect, useState } from 'react'
import type { Dictionary } from '@/lib/i18n/dictionary'
import { THEME_STORAGE_KEY, isThemeChoice, nextTheme, type ThemeChoice } from '@/lib/view/theme'

/**
 * One button that cycles system → light → dark. It names the state it is in,
 * for a screen reader and as a tooltip, because an icon alone cannot say
 * which of three states a two-icon button is showing.
 *
 * The server renders "system"; the stored choice is read after mount. The
 * boot script in app/layout.tsx has already applied it to the page by then,
 * so only this button's icon catches up.
 */
export function ThemeToggle({ dict }: { dict: Dictionary }) {
  const [choice, setChoice] = useState<ThemeChoice>('system')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (isThemeChoice(stored)) setChoice(stored)
    } catch {
      // Storage blocked: the system theme stands.
    }
  }, [])

  function apply(next: ThemeChoice) {
    setChoice(next)
    const root = document.documentElement
    if (next === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', next)
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // The choice holds for this page view; it just won't be remembered.
    }
  }

  const name = dict.theme[choice]

  return (
    <button
      type="button"
      onClick={() => apply(nextTheme(choice))}
      aria-label={`${dict.theme.label}: ${name}`}
      title={`${dict.theme.label}: ${name}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rule text-inkMuted transition-colors duration-150 ease-tide hover:border-ink hover:text-ink"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" focusable="false">
        {choice === 'light' && (
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="10" cy="10" r="3.5" />
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" />
          </g>
        )}
        {choice === 'dark' && (
          <path
            d="M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        )}
        {choice === 'system' && (
          <g>
            <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 3.5a6.5 6.5 0 0 1 0 13Z" fill="currentColor" />
          </g>
        )}
      </svg>
    </button>
  )
}
