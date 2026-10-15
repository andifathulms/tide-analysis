/**
 * The reader's theme choice: follow the system, or pin light or dark.
 *
 * The choice is a per-reader convenience kept in localStorage, and nothing
 * else depends on it — every colour is a token that globals.css redefines
 * under `data-theme` and under the system preference, so a reader with
 * storage blocked still gets their system's theme.
 */

export const THEMES = ['system', 'light', 'dark'] as const
export type ThemeChoice = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = 'pasut-theme'

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

/** The toggle cycles system → light → dark → system. */
export function nextTheme(current: ThemeChoice): ThemeChoice {
  const index = THEMES.indexOf(current)
  return THEMES[(index + 1) % THEMES.length] ?? 'system'
}

/**
 * Runs in <head> before first paint, so a pinned theme never flashes the
 * other one. Kept to ES5 and wrapped in try: storage can throw in a private
 * window, and a failure here must leave the system theme in place rather than
 * break the page.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`
