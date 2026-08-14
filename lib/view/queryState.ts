/**
 * Round-tripping an interactive control's state through the URL query string,
 * so a reader can link or bookmark a specific window rather than describing
 * how to drag a slider to reach it. Pure string handling — the DOM read/write
 * (`window.location`, `history.replaceState`) stays at the call site.
 */

/** A positive integer query parameter, or null if absent or not a finite number. */
export function readIntParam(search: string, key: string): number | null {
  const raw = new URLSearchParams(search).get(key)
  if (raw === null) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/** The query string with one key set to an integer (or removed, for null), the rest untouched. */
export function withIntParam(search: string, key: string, value: number | null): string {
  const params = new URLSearchParams(search)
  if (value === null) params.delete(key)
  else params.set(key, String(Math.round(value)))
  const next = params.toString()
  return next === '' ? '' : `?${next}`
}
