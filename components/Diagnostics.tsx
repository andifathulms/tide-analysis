import type { Dictionary } from '@/lib/i18n/dictionary'
import type { Conditioning, HarmonicFit } from '@/lib/tide/fit'
import type { HarmonicRefusal } from '@/lib/tide/fit'
import { describeConflict } from '@/lib/tide/rayleigh'

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
export function FitDiagnostics({ dict, fit }: { dict: Dictionary; fit: HarmonicFit }) {
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

    {fit.steps.length > 0 && (
      <section className="mt-4 rounded-r-card border-l-4 border-unresolved bg-unresolvedSoft/60 px-5 py-4">
        <h3 className="eyebrow text-unresolved">
          Datum bergeser di tengah rekaman
        </h3>
        <p className="mt-1.5 max-w-reading text-body">
          Nol alat berubah {fit.steps.length === 1 ? 'satu kali' : `${fit.steps.length} kali`}{' '}
          selama rekaman. Tinggi sebelum dan sesudahnya tidak merujuk nol yang sama, jadi setiap
          penggal diberi muka air rata-ratanya sendiri dan pergeserannya dilaporkan di bawah —
          bukan dibiarkan terserap ke dalam residu.
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
      <h2 className="eyebrow text-unresolved">
        {dict.common.refusal}
      </h2>
      <p className="mt-1.5 max-w-reading text-body">{refusal.message}</p>
      <ul className="mt-3 space-y-1 text-caption">
        {refusal.conflicts.slice(0, 6).map((conflict) => (
          <li key={`${conflict.a}-${conflict.b}`} className="text-inkMuted">
            {describeConflict(conflict)}
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
