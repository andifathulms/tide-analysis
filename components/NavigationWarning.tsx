import type { Dictionary } from '@/lib/i18n/dictionary'

/**
 * Invariant 15: this appears on every view that shows a predicted height, not
 * once on a landing page and not in a footer. A wrong low tide grounds a boat.
 */
export function NavigationWarning({ dict }: { dict: Dictionary }) {
  return (
    <aside
      role="note"
      className="border-l-4 border-unresolved bg-unresolved/5 px-4 py-3 text-sm"
    >
      <p className="control font-semibold uppercase tracking-wide text-unresolved">
        {dict.warning.title}
      </p>
      <p className="mt-1 max-w-3xl">{dict.warning.body}</p>
      <p className="mt-1 max-w-3xl font-medium">{dict.warning.official}</p>
    </aside>
  )
}
