import type { Dictionary } from '@/lib/i18n/dictionary'
import type { Conditioning, HarmonicFit } from '@/lib/tide/fit'
import type { HarmonicRefusal } from '@/lib/tide/fit'
import { describeConflict } from '@/lib/tide/rayleigh'

const CONDITIONING_CLASS: Record<Conditioning, string> = {
  baik: 'text-prediction',
  wajar: 'text-traceInk',
  marginal: 'text-residual',
  buruk: 'text-unresolved',
}

/**
 * The condition number, always shown with the constants it belongs to. It is
 * not a footnote: it is the statement of whether the amplitudes above mean
 * anything at all.
 */
export function FitDiagnostics({ dict, fit }: { dict: Dictionary; fit: HarmonicFit }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
      <div>
        <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
          {dict.common.conditionNumber}
        </dt>
        <dd className={`numeric text-lg ${CONDITIONING_CLASS[fit.conditioning]}`}>
          {Number.isFinite(fit.conditionNumber) ? fit.conditionNumber.toFixed(2) : '∞'}
          <span className="control ml-2 text-xs">{dict.conditioning[fit.conditioning]}</span>
        </dd>
      </div>
      <div>
        <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
          {dict.common.residualRms}
        </dt>
        <dd className="numeric text-lg text-residual">{fit.residualRmsM.toFixed(4)} m</dd>
      </div>
      <div>
        <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
          {dict.common.meanLevel}
        </dt>
        <dd className="numeric text-lg">{fit.meanLevelM.toFixed(4)} m</dd>
      </div>
      <div>
        <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
          {dict.common.recordLength}
        </dt>
        <dd className="numeric text-lg">
          {fit.lengthDays.toFixed(1)} {dict.common.days}
        </dd>
      </div>
    </dl>
  )
}

/**
 * A refusal is a result, not an error state. It names the conflicting pair and
 * the record length required, and it never shows an amplitude.
 */
export function RefusalNotice({
  dict,
  refusal,
}: {
  dict: Dictionary
  refusal: HarmonicRefusal
}) {
  return (
    <section className="border-l-4 border-unresolved bg-unresolved/5 px-4 py-3">
      <h2 className="control text-sm font-semibold uppercase tracking-wide text-unresolved">
        {dict.common.refusal}
      </h2>
      <p className="mt-2 max-w-3xl">{refusal.message}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {refusal.conflicts.slice(0, 6).map((conflict) => (
          <li key={`${conflict.a}-${conflict.b}`} className="text-traceInk/80">
            {describeConflict(conflict)}
          </li>
        ))}
      </ul>
      <p className="numeric mt-3 text-sm">
        {dict.common.recordLength}: {refusal.availableDays.toFixed(1)} {dict.common.days} ·{' '}
        {dict.common.requiredLength}: {refusal.requiredDays.toFixed(1)} {dict.common.days}
      </p>
    </section>
  )
}
