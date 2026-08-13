import type { Dictionary } from '@/lib/i18n/dictionary'
import type { ConstituentConstant } from '@/lib/tide/fit'
import type { ConstituentResolution } from '@/lib/tide/rayleigh'
import { Scroller } from '@/components/ui'

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
    <Scroller labelledBy="constituents-caption">
      <table className="w-full min-w-[640px] border-collapse text-caption">
        <caption id="constituents-caption" className="sr-only">
          {dict.tableName.constituents}
        </caption>
        <thead>
          <tr className="border-b border-rule text-left">
            <th scope="col" className="eyebrow py-2 pr-4 text-left">
              {dict.common.constituent}
            </th>
            <th scope="col" className="eyebrow py-2 pr-4 text-right">
              {dict.common.amplitude}
            </th>
            <th scope="col" className="eyebrow py-2 pr-4 text-right">
              {dict.common.phase}
            </th>
            <th scope="col" className="eyebrow py-2 pr-4 text-right">
              {dict.common.speed}
            </th>
            <th scope="col" className="eyebrow py-2 pr-4 text-right">
              {dict.common.period_h}
            </th>
            <th scope="col" className="eyebrow py-2 pr-4 text-right">
              {dict.common.nodalF}
            </th>
            <th scope="col" className="eyebrow py-2 text-right">
              {dict.common.nodalU}
            </th>
          </tr>
        </thead>
        <tbody className="numeric">
          {constants.map((constant) => (
            <tr key={constant.name} className="border-b border-rule/60 hover:bg-sunken/50">
              <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                {constant.name}
                <span className="ml-2 text-micro text-inkFaint">{constant.doodsonNumber}</span>
              </th>
              <td className="py-1.5 pr-4 text-right">
                {constant.amplitudeM.toFixed(4)}
                {showUncertainty && Number.isFinite(constant.amplitudeErrorM) && (
                  <span className="ml-1 text-micro text-inkFaint">
                    ±{constant.amplitudeErrorM.toFixed(4)}
                  </span>
                )}
              </td>
              <td className="py-1.5 pr-4 text-right">
                {constant.phaseDeg.toFixed(1)}
                {showUncertainty && Number.isFinite(constant.phaseErrorDeg) && (
                  <span className="ml-1 text-micro text-inkFaint">
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
            <tr key={row.name} className="border-b border-rule/60 bg-unresolvedSoft/70">
              <th scope="row" className="py-1.5 pr-4 text-left font-medium text-unresolved">
                {row.name}
              </th>
              <td colSpan={6} className="py-1.5 text-left text-caption text-unresolved">
                {dict.common.unresolved}
                {row.type === 'unresolved' && row.conflictsWith[0] !== undefined && (
                  <span className="ml-2 text-inkMuted">
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
    </Scroller>
  )
}
