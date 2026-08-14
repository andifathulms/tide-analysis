import type { Dictionary } from '@/lib/i18n/dictionary'
import { Callout } from '@/components/ui'

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
    <Callout tone="refusal" role="note" title={dict.warning.title} className="max-w-reading">
      <p>{dict.warning.body}</p>
      <p className="font-medium">{dict.warning.official}</p>
    </Callout>
  )
}
