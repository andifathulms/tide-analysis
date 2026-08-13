import { fill, type Dictionary } from '@/lib/i18n/dictionary'
import type { RecoveryRow } from '@/lib/tide/recovery'
import { Scroller } from '@/components/ui'

/**
 * What the solver does when the answer is already known.
 *
 * The site's whole argument is that constants are inferred rather than looked
 * up — and a reader has no way to check any of them, because a real record
 * comes with no answer key. This is the one place there is one. It is also
 * PRD §8's backbone, which the test suite has relied on since M1 and which no
 * reader had ever been shown.
 *
 * Presentational only: every number came from lib/tide/recovery.
 */
export function RecoveryPanel({
  dict,
  rows,
  lengthDays,
}: {
  dict: Dictionary
  rows: readonly RecoveryRow[]
  lengthDays: number
}) {
  if (rows.length === 0) return null
  const truth = rows[0]!.recovered

  return (
    <div className="space-y-4">
      <p className="max-w-reading text-body text-inkMuted">
        {fill(dict.resolusi.recoveryLead, { days: lengthDays })}
      </p>

      {/* What we chose, stated before any result, so it reads as an input. */}
      <p className="max-w-reading rounded-card border border-rule bg-sunken px-card py-3 text-caption">
        <span className="eyebrow block">{dict.resolusi.recoveryTruth}</span>
        <span className="numeric mt-1 block text-body text-ink">
          {truth
            .map((c) => `${c.name} ${c.truthM.toFixed(3)} m @ ${c.truthPhaseDeg}°`)
            .join(' · ')}
        </span>
        <span className="mt-2 block text-inkMuted">{dict.resolusi.recoveryNotAPlace}</span>
      </p>

      <Scroller labelledBy="recovery-caption">
        <table className="w-full min-w-[620px] border-collapse text-caption">
          <caption id="recovery-caption" className="sr-only">
            {dict.resolusi.recoveryTitle}
          </caption>
          <thead>
            <tr className="border-b border-rule text-left">
              <th scope="col" className="eyebrow py-2 pr-4">
                {dict.resolusi.recoveryNoise}
              </th>
              <th scope="col" className="eyebrow py-2 pr-4">
                {dict.resolusi.recoveryFitted}
              </th>
              <th scope="col" className="eyebrow py-2 pr-4 text-right">
                {dict.resolusi.recoveryWorst}
              </th>
              <th scope="col" className="eyebrow py-2 pr-4 text-right">
                {dict.resolusi.recoveryPhaseError}
              </th>
              <th scope="col" className="eyebrow py-2 text-right">
                {dict.common.residualRms}
              </th>
            </tr>
          </thead>
          <tbody className="numeric">
            {rows.map((row) => {
              const worstPhase = Math.max(...row.recovered.map((c) => c.phaseErrorDeg))
              return (
                <tr key={row.noiseSigmaM} className="border-b border-rule/60 align-baseline">
                  <th scope="row" className="py-2 pr-4 text-left font-medium whitespace-nowrap">
                    {row.noiseSigmaM === 0 ? '—' : `± ${row.noiseSigmaM.toFixed(2)} m`}
                  </th>
                  <td className="py-2 pr-4 text-inkMuted">
                    {row.recovered.map((c) => `${c.name} ${c.fittedM.toFixed(4)}`).join(' · ')}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {row.worstErrorM < 0.00005 ? '0' : row.worstErrorM.toFixed(4)}
                  </td>
                  <td className="py-2 pr-4 text-right text-inkMuted">
                    {worstPhase < 0.005 ? '0' : `${worstPhase.toFixed(2)}°`}
                  </td>
                  <td className="py-2 text-right text-residualText">
                    {row.residualRmsM.toFixed(4)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Scroller>

      <p className="max-w-reading border-l-4 border-prediction bg-predictionSoft/60 px-card py-3 text-caption">
        {fill(dict.resolusi.recoveryReading, { days: lengthDays })}
      </p>
    </div>
  )
}
