import type { Dictionary } from '@/lib/i18n/dictionary'
import type { CoveragePoint } from '@/lib/tide/coverage'
import { Caption, Scroller } from '@/components/ui'

/**
 * The second axis of what a record can support.
 *
 * The slider above this varies length. Nothing on the site varied
 * completeness, which taught by omission that duration is the only thing
 * between a reader and a constituent — a half-truth the bundle itself
 * disproves.
 *
 * Presentational only: every number came from lib/tide/coverage.
 */
export function CoveragePanel({
  dict,
  points,
}: {
  dict: Dictionary
  points: readonly CoveragePoint[]
}) {
  if (points.length === 0) return null

  return (
    <div className="space-y-4">
      <Scroller labelledBy="coverage-caption">
        <table className="w-full min-w-[560px] border-collapse text-caption">
          <caption id="coverage-caption" className="sr-only">
            {dict.tableName.coverage}
          </caption>
          <thead>
            <tr className="border-b border-rule text-left">
              <th scope="col" className="eyebrow py-2 pr-4">{dict.resolusi.coverageMask}</th>
              <th scope="col" className="eyebrow py-2 pr-4 text-right">{dict.resolusi.coverageRemoved}</th>
              <th scope="col" className="eyebrow py-2 pr-4 text-right">{dict.resolusi.coverageSamples}</th>
              <th scope="col" className="eyebrow py-2 pr-4 text-right">{dict.resolusi.coverageSpan}</th>
              <th scope="col" className="eyebrow py-2 pr-4 text-right">{dict.common.conditionNumber}</th>
              <th scope="col" className="eyebrow py-2 text-right">{dict.resolusi.coverageWorst}</th>
            </tr>
          </thead>
          <tbody className="numeric">
            {points.map((point, index) => (
              <tr
                key={`${point.kind}-${index}`}
                className={`border-b border-rule/60 ${
                  point.kind === 'actual' ? 'bg-sunken/50 font-medium' : ''
                }`}
              >
                <th scope="row" className="py-1.5 pr-4 text-left font-normal">
                  {dict.resolusi.coverageKind[point.kind]}
                </th>
                <td className="py-1.5 pr-4 text-right text-inkMuted">
                  {point.removedFraction === 0
                    ? '—'
                    : `${Math.round(point.removedFraction * 100)}%`}
                </td>
                <td className="py-1.5 pr-4 text-right text-inkMuted">{point.sampleCount}</td>
                <td className="py-1.5 pr-4 text-right">{point.spanDays.toFixed(1)}</td>
                <td className="py-1.5 pr-4 text-right">
                  {Number.isFinite(point.conditionNumber)
                    ? point.conditionNumber.toFixed(2)
                    : '∞'}
                </td>
                <td className="py-1.5 text-right">
                  {point.worst === null ? (
                    '—'
                  ) : (
                    <>
                      {point.worst.a}/{point.worst.b}{' '}
                      <span
                        className={
                          point.worst.correlation >= 0.6
                            ? 'text-unresolved'
                            : point.worst.correlation >= 0.3
                              ? 'text-residualText'
                              : 'text-inkFaint'
                        }
                      >
                        {point.worst.correlation.toFixed(2)}
                      </span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroller>

      <Caption>{dict.resolusi.coverageNote}</Caption>
    </div>
  )
}
