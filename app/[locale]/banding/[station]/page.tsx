import { notFound } from 'next/navigation'
import { NavigationWarning } from '@/components/NavigationWarning'
import { StationHeader, StationNav } from '@/components/StationNav'
import { RefusalNotice } from '@/components/Diagnostics'
import { Card, Section, Stat } from '@/components/ui'
import { dictionary, fill, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations } from '@/lib/records/registry'
import { admiraltyFit, compareMethods } from '@/lib/tide/admiralty'
import { ADMIRALTY_SET } from '@/lib/tide/constituents'
import { analyseStation } from '@/lib/view/station'
import { zoneOf } from '@/lib/view/format'

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    stations().map((station) => ({ locale, station: station.stationId })),
  )
}

export default async function ComparisonPage({
  params,
}: {
  params: { locale: string; station: string }
}) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)

  const analysis = await analyseStation(params.station, { constituents: ADMIRALTY_SET })
  if (analysis === null) notFound()
  const { station, record, primary, fallback, summary } = analysis
  const shown = primary.outcome.type === 'fit' ? primary : (fallback?.analysis ?? primary)
  const admiralty = admiraltyFit({ record })

  const rows =
    shown.outcome.type === 'fit' && admiralty.type === 'fit'
      ? compareMethods(shown.outcome.constants, admiralty.constants)
      : []

  return (
    <div className="space-y-section">
      {/*
       * The page's masthead: which station, which view, and the warning that
       * invariant 15 requires wherever a predicted height appears. One cluster
       * at a tight rhythm, so the section rhythm below can be generous without
       * pulling these three apart.
       */}
      <div className="space-y-4">
        <StationNav dict={dict} locale={locale} stationId={station.stationId} active="banding" />
        <StationHeader
          dict={dict}
          station={station}
          datumLabel={record.datum.label}
          zone={zoneOf(record)}
          gapHours={summary.gapHours}
        />
        <NavigationWarning dict={dict} compact />
      </div>

      <Section eyebrow={dict.banding.eyebrow} title={dict.banding.title} lead={dict.banding.lead} />

      {primary.outcome.type === 'refusal' && <RefusalNotice dict={dict} refusal={primary.outcome} />}
      {admiralty.type === 'refusal' && <RefusalNotice dict={dict} refusal={admiralty} />}

      {shown.outcome.type === 'fit' && admiralty.type === 'fit' && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <Stat
                label={`${dict.common.residualRms} — ${dict.common.leastSquares}`}
                value={shown.outcome.residualRmsM.toFixed(4)}
                unit="m"
                tone="residual"
              />
            </Card>
            <Card>
              <Stat
                label={`${dict.common.residualRms} — ${dict.common.admiralty}`}
                value={admiralty.residualRmsM.toFixed(4)}
                unit="m"
                tone="residual"
              />
            </Card>
            <Card>
              <Stat
                label={`${dict.common.conditionNumber} — ${dict.common.leastSquares}`}
                value={shown.outcome.conditionNumber.toFixed(2)}
              />
            </Card>
          </div>

          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] border-collapse text-caption">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th className="py-2 pr-4">{dict.common.constituent}</th>
                  <th className="py-2 pr-4 text-right">H — {dict.common.leastSquares}</th>
                  <th className="py-2 pr-4 text-right">H — {dict.common.admiralty}</th>
                  <th className="py-2 pr-4 text-right">{dict.banding.difference} H</th>
                  <th className="py-2 pr-4 text-right">g — {dict.common.leastSquares}</th>
                  <th className="py-2 pr-4 text-right">g — {dict.common.admiralty}</th>
                  <th className="py-2 pr-4 text-right">{dict.banding.difference} g</th>
                  <th className="py-2 text-left">{dict.common.determination}</th>
                </tr>
              </thead>
              <tbody className="numeric">
                {rows.map((row) => (
                  <tr key={row.name} className="border-b border-rule/60">
                    <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                      {row.name}
                    </th>
                    <td className="py-1.5 pr-4 text-right">
                      {row.leastSquaresAmplitudeM?.toFixed(4) ?? '—'}
                    </td>
                    <td className="py-1.5 pr-4 text-right">
                      {row.admiraltyAmplitudeM?.toFixed(4) ?? '—'}
                    </td>
                    <td
                      className={`py-1.5 pr-4 text-right ${
                        Math.abs(row.amplitudeDifferenceM ?? 0) > 0.03 ? 'text-unresolved' : ''
                      }`}
                    >
                      {row.amplitudeDifferenceM === null
                        ? '—'
                        : row.amplitudeDifferenceM.toFixed(4)}
                    </td>
                    <td className="py-1.5 pr-4 text-right">
                      {row.leastSquaresPhaseDeg?.toFixed(1) ?? '—'}
                    </td>
                    <td className="py-1.5 pr-4 text-right">
                      {row.admiraltyPhaseDeg?.toFixed(1) ?? '—'}
                    </td>
                    <td
                      className={`py-1.5 pr-4 text-right ${
                        Math.abs(row.phaseDifferenceDeg ?? 0) > 10 ? 'text-unresolved' : ''
                      }`}
                    >
                      {row.phaseDifferenceDeg === null ? '—' : row.phaseDifferenceDeg.toFixed(1)}
                    </td>
                    <td className="py-1.5 text-left text-caption">
                      {row.determination === 'disimpulkan' ? (
                        <span className="text-residualText">{dict.common.inferred}</span>
                      ) : row.determination === 'langsung' ? (
                        dict.common.direct
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="max-w-reading space-y-2 text-caption text-inkMuted">
            <p>
              {fill(dict.banding.inferredNote, { inferred: admiralty.inferred.join(', ') })}
            </p>
            <p>{dict.banding.scopeNote}</p>
          </section>
        </>
      )}
    </div>
  )
}
