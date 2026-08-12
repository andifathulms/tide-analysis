import type { Dictionary } from '@/lib/i18n/dictionary'

/**
 * Invariant 15: this appears on every view that shows a predicted height, not
 * once on a landing page and not in a footer. A wrong low tide grounds a boat.
 *
 * It has to be unmissable without being the loudest thing on every page — a
 * warning a reader learns to scroll past has stopped working. So it is compact
 * and firm, in the reserved red, and it names who to trust instead.
 */
export function NavigationWarning({
  dict,
  compact = false,
}: {
  dict: Dictionary
  compact?: boolean
}) {
  if (compact) {
    return (
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-card border border-unresolved/30 bg-unresolvedSoft/60 px-3 py-2 text-caption">
        <span className="font-semibold uppercase tracking-wide text-unresolved">
          {dict.warning.title}
        </span>
        <span className="text-inkMuted">{dict.warning.official}</span>
      </p>
    )
  }

  return (
    <aside
      role="note"
      className="rounded-r-card border-l-4 border-unresolved bg-unresolvedSoft/60 px-5 py-4"
    >
      <p className="eyebrow text-unresolved">{dict.warning.title}</p>
      <p className="mt-1.5 max-w-reading text-body">{dict.warning.body}</p>
      <p className="mt-1 max-w-reading text-body font-medium">{dict.warning.official}</p>
    </aside>
  )
}
