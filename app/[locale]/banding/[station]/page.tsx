import { notFound } from 'next/navigation'
import { NavigationWarning } from '@/components/NavigationWarning'
import { StationHeader, StationNav } from '@/components/StationNav'
import { RefusalNotice } from '@/components/Diagnostics'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
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
    <div className="space-y-6">
      <StationNav dict={dict} locale={locale} stationId={station.stationId} active="banding" />
      <StationHeader
        dict={dict}
        station={station}
        datumLabel={record.datum.label}
        zone={zoneOf(record)}
        gapHours={summary.gapHours}
      />
      <NavigationWarning dict={dict} />

      <h1 className="text-2xl">{dict.banding.title}</h1>
      <p className="max-w-3xl">{dict.banding.lead}</p>

      {primary.outcome.type === 'refusal' && <RefusalNotice dict={dict} refusal={primary.outcome} />}
      {admiralty.type === 'refusal' && <RefusalNotice dict={dict} refusal={admiralty} />}

      {shown.outcome.type === 'fit' && admiralty.type === 'fit' && (
        <>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="card p-4">
              <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
                {dict.common.residualRms} — {dict.common.leastSquares}
              </dt>
              <dd className="numeric text-2xl text-residual">
                {shown.outcome.residualRmsM.toFixed(4)} m
              </dd>
            </div>
            <div className="card p-4">
              <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
                {dict.common.residualRms} — {dict.common.admiralty}
              </dt>
              <dd className="numeric text-2xl text-residual">
                {admiralty.residualRmsM.toFixed(4)} m
              </dd>
            </div>
            <div className="card p-4">
              <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
                {dict.common.conditionNumber} — {dict.common.leastSquares}
              </dt>
              <dd className="numeric text-2xl">{shown.outcome.conditionNumber.toFixed(2)}</dd>
            </div>
          </dl>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="control border-b border-grid text-left text-xs uppercase tracking-wide">
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
                  <tr key={row.name} className="border-b border-grid/50">
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
                    <td className="control py-1.5 text-left text-xs">
                      {row.determination === 'disimpulkan' ? (
                        <span className="text-residual">{dict.common.inferred}</span>
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

          <section className="max-w-3xl space-y-2 text-sm text-traceInk/80">
            <p>
              Admiralty menyimpulkan {admiralty.inferred.join(' dan ')} dari tetangganya melalui
              rasio baku, bukan menyelesaikannya. Kuadrat terkecil menyelesaikan semua komponen
              bersama-sama sehingga memperhitungkan korelasi antar tetangga; itulah satu-satunya
              perbedaan mendasar antara keduanya di sini.
            </p>
            <p>
              Implementasi Admiralty di sini adalah skema proyeksi dan inferensi, bukan reproduksi
              tabulasi cetak NP 159 beserta pengali penyaringnya.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
