import type { Dictionary } from '@/lib/i18n/dictionary'
import type { LeakageEstimate } from '@/lib/tide/leakage'
import { Callout } from '@/components/ui'

/**
 * What the refusal above cost.
 *
 * A refusal with no accounting is just an absence: the reader is told the
 * record cannot separate P1 from K1 and has no way to learn whether they were
 * denied a rounding error or a twelve-centimetre constituent. This measures
 * the residual at the refused frequency and says so.
 *
 * The framing is doing real work and is not decoration. Every magnitude here
 * is contaminated by exactly the partner that caused the refusal, so the
 * confounding is printed beside the number rather than under it, the word
 * "amplitude" is avoided, no phase is shown, and the tone is the reserved red
 * that the rest of the site uses for things the record cannot support.
 */
export function LeakagePanel({
  dict,
  estimates,
}: {
  dict: Dictionary
  estimates: readonly LeakageEstimate[]
}) {
  if (estimates.length === 0) return null

  return (
    <Callout tone="refusal" title={dict.catatan.leakageTitle}>
      <p className="max-w-reading">{dict.catatan.leakageLead}</p>

      <ul className="mt-3 space-y-2">
        {estimates.map((estimate) => (
          <li key={estimate.name} className="text-body">
            <span className="numeric font-medium">{estimate.name}</span>{' '}
            <span className="numeric">≈ {estimate.magnitudeM.toFixed(3)} m</span>{' '}
            {estimate.isolated ? (
              <span className="text-inkMuted">{dict.catatan.leakageIsolated}</span>
            ) : (
              <span className="text-inkMuted">
                {dict.catatan.leakageConfounded}{' '}
                {estimate.confoundedWith.map((confounder, index) => (
                  <span key={confounder.name} className="numeric">
                    {index > 0 && ', '}
                    {confounder.name} ({confounder.correlation.toFixed(2)})
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 max-w-reading text-caption text-inkMuted">
        {dict.catatan.leakageWarning}
      </p>
    </Callout>
  )
}
