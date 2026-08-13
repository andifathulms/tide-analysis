import type { Dictionary } from '@/lib/i18n/dictionary'
import type { CorrelationReport } from '@/lib/tide/correlation'
import { Caption, Scroller } from '@/components/ui'

/**
 * The geometry the condition number summarises.
 *
 * κ says the solve was hard and the Rayleigh refusal says which pairs are
 * impossible. Neither says *how* hard, or because of whom — and between
 * "cleanly resolved" and "refused" there is a continuum the resolved/unresolved
 * flag flattens. A pair at 0.85 is reported here with the same confidence as a
 * pair at 0.02, and that is the thing this panel exists to stop.
 *
 * Presentational only: every number came from lib/tide/correlation.
 */

/**
 * Bands, stated rather than shaded continuously.
 *
 * A smooth ramp reads as precision the measure does not claim, and a reader
 * cannot recover a number from a colour. These five thresholds are arbitrary
 * in the way any classification is arbitrary — so they are printed in the
 * legend, and the exact value is on every cell as a title.
 */
const BANDS = [
  { floor: 0.9, cell: 'bg-unresolved text-surface', key: 'identical' },
  { floor: 0.6, cell: 'bg-unresolvedSoft text-unresolved', key: 'strong' },
  { floor: 0.3, cell: 'bg-residualSoft text-residualText', key: 'moderate' },
  { floor: 0.1, cell: 'bg-sunken text-inkMuted', key: 'slight' },
  { floor: 0, cell: 'bg-surface text-inkFaint', key: 'negligible' },
] as const

type BandKey = (typeof BANDS)[number]['key']

/** The last band has floor 0, so every finite correlation lands somewhere. */
function bandFor(correlation: number): (typeof BANDS)[number] {
  for (const band of BANDS) {
    if (correlation >= band.floor) return band
  }
  return BANDS[BANDS.length - 1] as (typeof BANDS)[number]
}

export function CorrelationPanel({
  dict,
  report,
}: {
  dict: Dictionary
  report: CorrelationReport
}) {
  const { names, matrix, worst } = report
  const againstMean = report.rungs
    .filter((rung) => rung.b === null && rung.correlation >= 0.1)
    .sort((a, b) => b.correlation - a.correlation)

  return (
    <div className="space-y-4">
      {worst !== null && (
        <p className="max-w-reading text-body">
          {dict.komponen.correlationWorst}{' '}
          <span className="numeric font-medium">
            {worst.a} / {worst.b}
          </span>{' '}
          <span className="numeric">({worst.correlation.toFixed(3)})</span>.
        </p>
      )}

      <Scroller labelledBy="correlation-caption">
        <table className="border-collapse text-micro">
          <caption id="correlation-caption" className="sr-only">
            {dict.tableName.correlation}
          </caption>
          <thead>
            <tr>
              {/* The matrix corner heads nothing, so it is a cell, not a header. */}
              <td className="p-1" />
              {names.map((name) => (
                <th key={name} scope="col" className="numeric p-1 text-inkFaint font-medium">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((rowName, i) => (
              <tr key={rowName}>
                <th
                  scope="row"
                  className="numeric py-1 pr-2 text-right font-medium text-inkMuted"
                >
                  {rowName}
                </th>
                {names.map((colName, j) => {
                  // Lower triangle only: the matrix is symmetric, and printing
                  // both halves invites a reader to look for a difference.
                  if (j > i) return <td key={colName} className="p-0" />
                  const value = matrix[i]?.[j] ?? 0
                  if (i === j) {
                    return (
                      <td
                        key={colName}
                        className="border border-rule bg-sunken/50 p-0 text-center text-inkFaint"
                      >
                        <span className="numeric block px-2 py-1.5">—</span>
                      </td>
                    )
                  }
                  const band = bandFor(value)
                  return (
                    <td
                      key={colName}
                      className={`border border-rule p-0 text-center ${band.cell}`}
                      title={`${rowName} / ${colName} = ${value.toFixed(4)}`}
                    >
                      <span className="numeric block px-2 py-1.5">{value.toFixed(2)}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Scroller>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-micro">
        {BANDS.map((band) => (
          <li key={band.key} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-6 shrink-0 rounded-sm border border-rule ${band.cell}`}
            />
            <span className="text-inkMuted">
              {dict.komponen.correlationBands[band.key as BandKey]}
            </span>
            <span className="numeric text-inkFaint">≥ {band.floor.toFixed(1)}</span>
          </li>
        ))}
      </ul>

      {againstMean.length > 0 && (
        <p className="max-w-reading text-caption text-inkMuted">
          {dict.komponen.correlationMean}{' '}
          {againstMean.map((rung, index) => (
            <span key={rung.a} className="numeric">
              {index > 0 && ', '}
              {rung.a} ({rung.correlation.toFixed(2)})
            </span>
          ))}
          .
        </p>
      )}

      <Caption>{dict.komponen.correlationNote}</Caption>
    </div>
  )
}
