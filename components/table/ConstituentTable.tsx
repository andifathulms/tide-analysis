import type { Dictionary } from '@/lib/i18n/dictionary'
import type { ConstituentConstant } from '@/lib/tide/fit'
import type { ConstituentResolution } from '@/lib/tide/rayleigh'

/**
 * The constituent table as a printed column: tabular numerals throughout, so
 * the digits align and do not reflow as the numbers update.
 *
 * Invariant 7: a constituent is either reported with its resolvability status
 * or marked unresolved. There is no third state where a number appears without
 * one — an unresolved row shows no amplitude at all.
 */
export function ConstituentTable({
  dict,
  constants,
  unresolved = [],
  showUncertainty = true,
}: {
  dict: Dictionary
  constants: readonly ConstituentConstant[]
  unresolved?: readonly ConstituentResolution[]
  showUncertainty?: boolean
}) {
  const unresolvedRows = unresolved.filter((r) => r.type === 'unresolved')

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-grid text-left control text-xs uppercase tracking-wide">
            <th scope="col" className="py-2 pr-4">
              {dict.common.constituent}
            </th>
            <th scope="col" className="py-2 pr-4 text-right">
              {dict.common.amplitude}
            </th>
            <th scope="col" className="py-2 pr-4 text-right">
              {dict.common.phase}
            </th>
            <th scope="col" className="py-2 pr-4 text-right">
              {dict.common.speed}
            </th>
            <th scope="col" className="py-2 pr-4 text-right">
              {dict.common.period_h}
            </th>
            <th scope="col" className="py-2 pr-4 text-right">
              {dict.common.nodalF}
            </th>
            <th scope="col" className="py-2 text-right">
              {dict.common.nodalU}
            </th>
          </tr>
        </thead>
        <tbody className="numeric">
          {constants.map((constant) => (
            <tr key={constant.name} className="border-b border-grid/50">
              <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                {constant.name}
                <span className="ml-2 text-xs text-traceInk/50">{constant.doodsonNumber}</span>
              </th>
              <td className="py-1.5 pr-4 text-right">
                {constant.amplitudeM.toFixed(4)}
                {showUncertainty && Number.isFinite(constant.amplitudeErrorM) && (
                  <span className="ml-1 text-xs text-traceInk/50">
                    ±{constant.amplitudeErrorM.toFixed(4)}
                  </span>
                )}
              </td>
              <td className="py-1.5 pr-4 text-right">
                {constant.phaseDeg.toFixed(1)}
                {showUncertainty && Number.isFinite(constant.phaseErrorDeg) && (
                  <span className="ml-1 text-xs text-traceInk/50">
                    ±{constant.phaseErrorDeg.toFixed(1)}
                  </span>
                )}
              </td>
              <td className="py-1.5 pr-4 text-right">{constant.speedDegPerHour.toFixed(6)}</td>
              <td className="py-1.5 pr-4 text-right">
                {(360 / constant.speedDegPerHour).toFixed(3)}
              </td>
              <td className="py-1.5 pr-4 text-right">{constant.nodalF.toFixed(4)}</td>
              <td className="py-1.5 text-right">{constant.nodalUDeg.toFixed(2)}</td>
            </tr>
          ))}

          {unresolvedRows.map((row) => (
            <tr key={row.name} className="border-b border-grid/50 bg-unresolved/5">
              <th scope="row" className="py-1.5 pr-4 text-left font-medium text-unresolved">
                {row.name}
              </th>
              <td colSpan={6} className="py-1.5 text-left text-xs text-unresolved control">
                {dict.common.unresolved}
                {row.type === 'unresolved' && row.conflictsWith[0] !== undefined && (
                  <span className="ml-2 text-traceInk/70">
                    {row.conflictsWith[0].a === row.conflictsWith[0].b
                      ? `Z₀ · ${row.conflictsWith[0].requiredDays.toFixed(0)} ${dict.common.days}`
                      : `${row.conflictsWith[0].a}/${row.conflictsWith[0].b} · ${row.conflictsWith[0].requiredDays.toFixed(0)} ${dict.common.days}`}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
