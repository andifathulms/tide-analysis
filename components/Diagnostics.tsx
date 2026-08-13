import type { Dictionary } from '@/lib/i18n/dictionary'
import type { Conditioning, HarmonicFit } from '@/lib/tide/fit'
import type { HarmonicRefusal } from '@/lib/tide/fit'
import Link from 'next/link'
import { fill } from '@/lib/i18n/dictionary'
import type { ResolutionConflict } from '@/lib/tide/rayleigh'

const CONDITIONING_CLASS: Record<Conditioning, string> = {
  baik: 'text-prediction',
  wajar: 'text-ink',
  marginal: 'text-residualText',
  buruk: 'text-unresolved',
}

/**
 * The condition number, always shown with the constants it belongs to. It is
 * not a footnote: it is the statement of whether the amplitudes above mean
 * anything at all.
 */
export function FitDiagnostics({
  dict,
  fit,
  correlationHref,
}: {
  dict: Dictionary
  fit: HarmonicFit
  /** Where the geometry behind this κ is shown, when the page can link to it. */
  correlationHref?: string
}) {
  return (
    <>
    <dl className="card grid grid-cols-2 gap-6 p-5 sm:grid-cols-4">
      <div>
        <dt className="eyebrow">
          {dict.common.conditionNumber}
        </dt>
        <dd className={`numeric text-title leading-none ${CONDITIONING_CLASS[fit.conditioning]}`}>
          {Number.isFinite(fit.conditionNumber) ? fit.conditionNumber.toFixed(2) : '∞'}
          <span className="ml-2 text-caption font-normal text-inkFaint">{dict.conditioning[fit.conditioning]}</span>
        </dd>
      </div>
      <div>
        <dt className="eyebrow">
          {dict.common.residualRms}
        </dt>
        <dd className="numeric text-title leading-none text-residualText">{fit.residualRmsM.toFixed(4)} m</dd>
      </div>
      <div>
        <dt className="eyebrow">
          {dict.common.meanLevel}
        </dt>
        <dd className="numeric text-title leading-none">{fit.meanLevelM.toFixed(4)} m</dd>
      </div>
      <div>
        <dt className="eyebrow">
          {dict.common.recordLength}
        </dt>
        <dd className="numeric text-title leading-none">
          {fit.lengthDays.toFixed(1)} {dict.common.days}
        </dd>
      </div>
    </dl>

    {/*
     * What κ is, beside the κ it explains.
     *
     * The number and the word "baik" were the whole story on this page, with
     * the definition a page away on /metode. CLAUDE.md's third principle is
     * that a solver reporting numbers without saying whether they mean
     * anything is the failure this project exists to expose — which the
     * project's own headline diagnostic was doing.
     */}
    <div className="mt-4 max-w-reading space-y-2 border-l-4 border-prediction bg-predictionSoft/60 px-card py-3 text-caption">
      <p>{dict.kappa.what}</p>
      <p>
        {fill(dict.kappa.meaning, {
          kappa: Number.isFinite(fit.conditionNumber)
            ? fit.conditionNumber.toFixed(1)
            : '∞',
        })}
      </p>
      <p className="numeric text-inkMuted">{dict.kappa.thresholds}</p>
      {correlationHref !== undefined && (
        <p>
          <Link
            href={correlationHref}
            className="text-prediction underline underline-offset-4 hover:text-ink"
          >
            {dict.kappa.where}
          </Link>
        </p>
      )}
    </div>

    {fit.steps.length > 0 && (
      <section className="mt-4 rounded-r-card border-l-4 border-unresolved bg-unresolvedSoft/60 px-5 py-4">
        {/*
         * Invariant 9 makes the datum first-class, and this block is where a
         * moved zero gets announced. It wore `eyebrow` — 12px, uppercase —
         * which put the loudest fact about the record in the quietest type on
         * the page.
         */}
        <h3 className="text-title text-unresolved">{dict.catatan.stepTitle}</h3>
        <p className="mt-1.5 max-w-reading text-body">
          {fill(dict.catatan.stepBody, {
            times: `${fit.steps.length}×`,
          })}
        </p>
        <ul className="numeric mt-3 space-y-1 text-caption">
          {fit.levels.map((level) => (
            <li key={level.fromSec}>
              Z₀ = {level.meanLevelM.toFixed(4)} m
              {level.shiftFromPreviousM !== null && (
                <span className="ml-2 text-unresolved">
                  ({level.shiftFromPreviousM >= 0 ? '+' : ''}
                  {level.shiftFromPreviousM.toFixed(4)} m)
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    )}
    </>
  )
}

/**
 * The refusal sentences, built here rather than read off `refusal.message`.
 *
 * lib/tide bakes an Indonesian string into every refusal and conflict, which
 * is how an English reader ended up meeting "S2 dan K2 berbeda hanya
 * 0.0821°/jam" on /en. Everything those sentences say is already in the
 * structured fields — the pair, the speed difference, the length required,
 * the length available — so the words can come from the dictionary and the
 * numbers from the result. The numerical core is not touched.
 */
function describeConflict(dict: Dictionary, conflict: ResolutionConflict): string {
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

function headline(dict: Dictionary, refusal: HarmonicRefusal): string {
  const worst = refusal.conflicts[0]
  // 'insufficient-data' refusals count samples against parameters, and neither
  // number is on the refusal as a structured field — only inside its message.
  // They cannot fire on a bundled record, which carries thousands of samples,
  // so the baked string stands until the core has the counts to rebuild from.
  if (refusal.reason !== 'rayleigh' || worst === undefined) return refusal.message
  const values = {
    a: worst.a,
    b: worst.b,
    available: refusal.availableDays.toFixed(1),
  }
  return worst.a === worst.b
    ? fill(dict.refusalText.rayleighMean, values)
    : fill(dict.refusalText.rayleighPair, values)
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
    <section className="rounded-r-card border-l-4 border-unresolved bg-unresolvedSoft/60 px-5 py-4">
      {/*
       * The refusal is invariant 6, the project's central honesty mechanism,
       * and it was set in the smallest type the site has — visually ranked
       * below the section heading that contains it. The eyebrow stays as a
       * label above the heading rather than being the heading.
       */}
      <p className="eyebrow text-unresolved">{dict.common.refusalLabel}</p>
      <h2 className="mt-1 text-title text-unresolved">{dict.common.refusal}</h2>
      <p className="mt-2 max-w-reading text-body">{headline(dict, refusal)}</p>
      <ul className="mt-3 space-y-1 text-caption">
        {refusal.conflicts.slice(0, 6).map((conflict) => (
          <li key={`${conflict.a}-${conflict.b}`} className="text-inkMuted">
            {describeConflict(dict, conflict)}
          </li>
        ))}
      </ul>
      <p className="numeric mt-3 text-caption text-inkMuted">
        {dict.common.recordLength}: {refusal.availableDays.toFixed(1)} {dict.common.days} ·{' '}
        {dict.common.requiredLength}: {refusal.requiredDays.toFixed(1)} {dict.common.days}
      </p>
    </section>
  )
}
