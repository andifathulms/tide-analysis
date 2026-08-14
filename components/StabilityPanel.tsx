import { fill, type Dictionary } from '@/lib/i18n/dictionary'
import type { StabilityReport } from '@/lib/tide/stability'
import { formatDate } from '@/lib/view/format'
import { Callout, Scroller } from '@/components/ui'

/**
 * Whether the constants above are a property of the harbour or of these months.
 *
 * The site could shorten the window and split it, but never move it — so its
 * foundational claim, that amplitude and phase are local properties, was the
 * one claim it never tested. This puts four independent stretches of the same
 * record side by side and lets the swing answer.
 *
 * Presentational only: every number came from lib/tide/stability.
 */

/** Above this the answer moved enough between stretches to be worth doubting. */
const NOTABLE_SWING = 0.1

export function StabilityPanel({
  dict,
  report,
}: {
  dict: Dictionary
  report: StabilityReport
}) {
  if (report.constituents.length === 0) return null

  return (
    <div className="space-y-4">
      <p className="max-w-reading text-body text-inkMuted">
        {fill(dict.catatan.stabilityLead, { count: report.windows.length })}
      </p>

      <ol className="flex flex-wrap gap-x-6 gap-y-1 text-caption text-inkFaint">
        {report.windows.map((window, index) => (
          <li key={window.startSec} className="numeric">
            <span className="text-inkMuted">
              {dict.catatan.stabilityWindow} {index + 1}
            </span>{' '}
            {formatDate(window.startSec)} — {formatDate(window.endSec)}
          </li>
        ))}
      </ol>

      <Scroller labelledBy="stability-caption">
        <table className="w-full min-w-[560px] border-collapse text-caption">
          <caption id="stability-caption" className="sr-only">
            {dict.catatan.stabilityTitle}
          </caption>
          <thead>
            <tr className="border-b border-rule text-left">
              <th scope="col" className="eyebrow py-2 pr-4">
                {dict.common.constituent}
              </th>
              <th scope="col" className="eyebrow py-2 pr-4 text-right">
                {dict.catatan.stabilityMean}
              </th>
              <th scope="col" className="eyebrow py-2 pr-4 text-right">
                {dict.catatan.stabilityRange}
              </th>
              <th scope="col" className="eyebrow py-2 pr-4 text-right">
                {dict.catatan.stabilitySpread}
              </th>
              <th scope="col" className="eyebrow py-2 text-right">
                {dict.catatan.stabilityPhase}
              </th>
            </tr>
          </thead>
          <tbody className="numeric">
            {report.constituents.map((constituent) => {
              const notable = constituent.amplitudeSpread >= NOTABLE_SWING
              return (
                <tr key={constituent.name} className="border-b border-rule/60">
                  <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                    {constituent.name}
                  </th>
                  <td className="py-1.5 pr-4 text-right">
                    {constituent.meanAmplitudeM.toFixed(4)}
                  </td>
                  <td className="py-1.5 pr-4 text-right text-inkMuted">
                    {constituent.minAmplitudeM.toFixed(4)} —{' '}
                    {constituent.maxAmplitudeM.toFixed(4)}
                  </td>
                  <td
                    className={`py-1.5 pr-4 text-right ${
                      notable ? 'text-unresolved' : 'text-inkMuted'
                    }`}
                  >
                    {(constituent.amplitudeSpread * 100).toFixed(0)}%
                  </td>
                  <td
                    className={`py-1.5 text-right ${
                      notable ? 'text-unresolved' : 'text-inkMuted'
                    }`}
                  >
                    ±{constituent.phaseSpreadDeg.toFixed(1)}°
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Scroller>

      {report.incomparable.length > 0 && (
        <p className="max-w-reading text-caption text-inkMuted">
          {dict.catatan.stabilityIncomparable}{' '}
          <span className="numeric">{report.incomparable.join(', ')}</span>.
        </p>
      )}

      <Callout tone="warning" size="caption" className="max-w-reading">
        {dict.catatan.stabilityReading}
      </Callout>
    </div>
  )
}
