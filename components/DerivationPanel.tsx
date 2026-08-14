import { fill, type Dictionary } from '@/lib/i18n/dictionary'
import type { Derivation } from '@/lib/view/derivation'
import { formatDateTime, UTC_DISPLAY } from '@/lib/view/format'
import { Callout, Scroller } from '@/components/ui'

/**
 * The step between the record and the constants, which the site never showed.
 *
 * Everything here is the fit's own arithmetic on the station's own record, at
 * four consecutive real timestamps. It sits directly under the constituent
 * table so a reader can look up from the worked H and g to the row they
 * reproduce, and it ends by naming what it simplified rather than leaving the
 * reader to discover it.
 *
 * Presentational only: every number came from lib/view/derivation.
 */

/** The six astronomical elements, in the order the Doodson coefficients take. */
const ELEMENTS = ['τ', 's', 'h', 'p', 'N', 'p′'] as const

/** V(t) written out as a sum, with the zero terms dropped. */
function argumentFormula(coefficients: readonly number[]): string {
  const terms = coefficients
    .map((n, i) => ({ n, element: ELEMENTS[i] as string }))
    .filter((term) => term.n !== 0)
    .map((term, index) => {
      const sign = term.n < 0 ? '−' : index === 0 ? '' : '+'
      const size = Math.abs(term.n)
      const factor = size === 1 ? '' : String(size)
      return `${sign}${sign === '' ? '' : ' '}${factor}${term.element}`
    })
  return terms.join(' ') || '0'
}

export function DerivationPanel({
  dict,
  derivation,
}: {
  dict: Dictionary
  derivation: Derivation
}) {
  const { name } = derivation
  const offset =
    derivation.offsetDeg === 0
      ? ''
      : ` ${derivation.offsetDeg < 0 ? '−' : '+'} ${Math.abs(derivation.offsetDeg)}°`

  return (
    <div className="space-y-4">
      <p className="max-w-reading text-body text-inkMuted">{dict.catatan.derivationLead}</p>

      <ol className="space-y-4">
        <li className="max-w-reading text-body">
          {fill(dict.catatan.derivationArgument, {
            name,
            coefficients: derivation.coefficients.join(' '),
            formula: argumentFormula(derivation.coefficients),
            offset,
          })}
          <p className="mt-1.5 text-caption text-inkFaint">{dict.catatan.derivationElements}</p>
        </li>

        <li className="text-body">
          <p className="max-w-reading">{fill(dict.catatan.derivationColumns, { name })}</p>

          <div className="mt-3">
            <Scroller labelledBy="derivation-caption">
              <table className="w-full min-w-[560px] border-collapse text-caption">
                <caption id="derivation-caption" className="sr-only">
                  {fill(dict.catatan.derivationTitle, { name })}
                </caption>
                <thead>
                  <tr className="border-b border-rule text-left">
                    <th scope="col" className="eyebrow py-2 pr-4">
                      {dict.catatan.derivationTime}
                    </th>
                    <th scope="col" className="eyebrow py-2 pr-4 text-right">
                      {dict.catatan.derivationV}
                    </th>
                    <th scope="col" className="eyebrow py-2 pr-4 text-right">
                      {dict.catatan.derivationCos}
                    </th>
                    <th scope="col" className="eyebrow py-2 pr-4 text-right">
                      {dict.catatan.derivationSin}
                    </th>
                    <th scope="col" className="eyebrow py-2 pr-4 text-right">
                      {fill(dict.catatan.derivationShare, { name })}
                    </th>
                    <th scope="col" className="eyebrow py-2 text-right">
                      {dict.catatan.derivationObserved}
                    </th>
                  </tr>
                </thead>
                <tbody className="numeric">
                  {derivation.rows.map((row) => (
                    <tr key={row.atSec} className="border-b border-rule/60">
                      <td className="py-1.5 pr-4 whitespace-nowrap">
                        {formatDateTime(row.atSec, UTC_DISPLAY)}
                      </td>
                      <td className="py-1.5 pr-4 text-right text-inkMuted">
                        {row.argumentDeg.toFixed(2)}
                      </td>
                      <td className="py-1.5 pr-4 text-right text-inkMuted">
                        {row.cosine.toFixed(4)}
                      </td>
                      <td className="py-1.5 pr-4 text-right text-inkMuted">
                        {row.sine.toFixed(4)}
                      </td>
                      <td className="py-1.5 pr-4 text-right text-prediction">
                        {row.contributionM >= 0 ? '+' : ''}
                        {row.contributionM.toFixed(4)}
                      </td>
                      <td className="py-1.5 text-right">{row.observedM.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroller>
          </div>
        </li>

        <li className="max-w-reading text-body">
          {fill(dict.catatan.derivationSolve, {
            name,
            a: derivation.a.toFixed(4),
            b: derivation.b.toFixed(4),
          })}
        </li>

        <li className="max-w-reading text-body">
          {fill(dict.catatan.derivationBack, {
            name,
            amplitude: derivation.amplitudeM.toFixed(4),
            phase: derivation.phaseDeg.toFixed(1),
          })}
        </li>
      </ol>

      {/* What the walkthrough left out, stated rather than left to be found. */}
      <Callout tone="warning" size="caption" className="max-w-reading">
        {fill(dict.catatan.derivationHonesty, { name })}
      </Callout>
    </div>
  )
}
