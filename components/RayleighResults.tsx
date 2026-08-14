import { ConstituentTable } from '@/components/table/ConstituentTable'
import { Callout } from '@/components/ui'
import { fill, type Dictionary } from '@/lib/i18n/dictionary'
import { conditioningOf } from '@/lib/tide/fit'
import type { ResolutionConflict } from '@/lib/tide/rayleigh'
import type { WindowState } from '@/lib/view/window'

/**
 * What a window supports, rendered. Shared by the server, which draws the
 * default window so the page says something without JavaScript, and by the
 * slider, which redraws it as the window changes.
 *
 * Presentational only: every number came from lib/view/window.
 */

/** Built here from the structured conflict, so the sentence can be localised. */
function describe(dict: Dictionary, conflict: ResolutionConflict): string {
  const values = {
    a: conflict.a,
    b: conflict.b,
    separation: conflict.separationDegPerHour.toFixed(4),
    required: conflict.requiredDays.toFixed(1),
    available: (conflict.availableHours / 24).toFixed(1),
  }
  return conflict.a === conflict.b
    ? fill(dict.refusalText.conflictMean, values)
    : fill(dict.refusalText.conflictPair, values)
}

export function RayleighResults({ dict, state }: { dict: Dictionary; state: WindowState }) {
  const fit = state.outcome !== null && state.outcome.type === 'fit' ? state.outcome : null

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-card">
          <h3 className="eyebrow">{dict.resolusi.conditionTitle}</h3>
          <p
            className={`numeric text-display ${
              fit === null
                ? 'text-unresolved'
                : conditioningOf(fit.conditionNumber) === 'buruk'
                  ? 'text-unresolved'
                  : conditioningOf(fit.conditionNumber) === 'marginal'
                    ? 'text-residualText'
                    : 'text-prediction'
            }`}
          >
            {fit === null ? '—' : fit.conditionNumber.toFixed(2)}
          </p>
          {fit !== null && (
            <p className="mt-1 text-caption text-inkFaint">{dict.conditioning[fit.conditioning]}</p>
          )}
        </div>

        <div className="card p-card">
          <h3 className="eyebrow">{dict.resolusi.keptTitle}</h3>
          <p className="numeric mt-1 text-caption leading-relaxed text-prediction">
            {state.kept.join(' · ') || '—'}
          </p>
        </div>

        <div className="card p-card">
          <h3 className="eyebrow">{dict.resolusi.droppedTitle}</h3>
          <p className="numeric mt-1 text-caption leading-relaxed text-unresolved">
            {state.dropped.map((d) => d.name).join(' · ') || '—'}
          </p>
        </div>
      </div>

      {state.requested.type === 'refusal' && (
        <Callout
          tone="refusal"
          as="section"
          title={dict.common.refusalLabel}
          heading={dict.common.refusal}
        >
          <p>{fill(dict.resolusi.refusalIntro, { days: state.days })}</p>
          <ul className="space-y-1 text-caption text-inkMuted">
            {state.requested.conflicts.slice(0, 5).map((conflict) => (
              <li key={`${conflict.a}-${conflict.b}-${conflict.requiredHours}`}>
                {describe(dict, conflict)}
              </li>
            ))}
          </ul>
        </Callout>
      )}

      {fit !== null && (
        <ConstituentTable dict={dict} constants={fit.constants} unresolved={state.dropped} />
      )}
    </>
  )
}
