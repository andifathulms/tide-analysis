import { notFound } from 'next/navigation'
import { NavigationWarning } from '@/components/NavigationWarning'
import { TideChart } from '@/components/chart/TideChart'
import { StationHeader, StationNav } from '@/components/StationNav'
import { RefusalNotice } from '@/components/Diagnostics'
import { Section } from '@/components/ui'
import { dictionary, fill, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations } from '@/lib/records/registry'
import { buildChartModel } from '@/lib/chart/model'
import { findExtrema, predictHeights, timeGrid } from '@/lib/tide/predict'
import { analyseStation } from '@/lib/view/station'
import { formatClock, formatDate, formatDateTime, zoneOf } from '@/lib/view/format'

/** Seven days beyond the end of the record. */
const FORWARD_DAYS = 7

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    stations().map((station) => ({ locale, station: station.stationId })),
  )
}

export default async function PredictionPage({
  params,
}: {
  params: { locale: string; station: string }
}) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)

  const analysis = await analyseStation(params.station)
  if (analysis === null) notFound()
  const { station, record, primary, fallback, summary } = analysis
  const shown = primary.outcome.type === 'fit' ? primary : (fallback?.analysis ?? primary)
  const zone = zoneOf(record)

  if (shown.outcome.type !== 'fit') {
    return (
      <div className="space-y-6">
        {/*
       * The page's masthead: which station, which view, and the warning that
       * invariant 15 requires wherever a predicted height appears. One cluster
       * at a tight rhythm, so the section rhythm below can be generous without
       * pulling these three apart.
       */}
      <div className="space-y-4">
        <StationNav dict={dict} locale={locale} stationId={station.stationId} active="prediksi" />
          <NavigationWarning dict={dict} />
      </div>
        <RefusalNotice dict={dict} refusal={shown.outcome} />
      </div>
    )
  }

  const fit = shown.outcome
  const startSec = fit.windowEndSec
  const endSec = startSec + FORWARD_DAYS * 86400
  const constants = fit.constants.map((c) => ({
    name: c.name,
    amplitudeM: c.amplitudeM,
    phaseDeg: c.phaseDeg,
  }))

  const timesSec = timeGrid(startSec, endSec, 600)
  const heightsM = predictHeights({ meanLevelM: fit.meanLevelM, constants, timesSec })
  const extrema = findExtrema({
    meanLevelM: fit.meanLevelM,
    constants,
    startSec,
    endSec,
    stepSec: 60,
  })

  const model = buildChartModel({
    timesSec,
    observedM: heightsM,
    modelM: null,
    residualM: null,
    intervalSec: 600,
    width: 1100,
    chartHeight: 300,
    residualHeight: 0,
    datums: [{ label: `Z₀ ${record.datum.code}`, heightM: fit.meanLevelM, emphasis: true }],
  })

  return (
    <div className="space-y-section">
      <StationNav dict={dict} locale={locale} stationId={station.stationId} active="prediksi" />
      <StationHeader
        dict={dict}
        station={station}
        datumLabel={record.datum.label}
        datumNote={record.datum.note}
        zone={zone}
        gapHours={summary.gapHours}
      />
      <NavigationWarning dict={dict} />

      <Section
        eyebrow={dict.prediksi.eyebrow}
        title={dict.prediksi.title}
        lead={dict.prediksi.lead}
      />
      <p className="numeric max-w-reading text-caption text-inkMuted">
        {formatDate(startSec, zone)} — {formatDate(endSec, zone)} · {dict.common.datum}:{' '}
        {record.datum.code} · {dict.common.nodalAtPrediction}
      </p>

      <figure className="card p-4">
        <TideChart
          model={model}
          observedLabel={dict.common.predicted}
          predictedLabel={dict.common.predicted}
          residualLabel={dict.common.residual}
        />
      </figure>

      <section className="space-y-3">
        <h2 className="text-headline">{dict.prediksi.extremaTitle}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-caption">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="py-2 pr-4">{dict.common.time}</th>
                <th className="py-2 pr-4">
                  {dict.prediksi.clock} ({zone.label})
                </th>
                <th className="py-2 pr-4">{dict.prediksi.kind}</th>
                <th className="py-2 text-right">{dict.common.height} (m)</th>
              </tr>
            </thead>
            <tbody className="numeric">
              {extrema.map((extremum) => (
                <tr key={extremum.timeSec} className="border-b border-rule/60">
                  <td className="py-1.5 pr-4">{formatDate(extremum.timeSec, zone)}</td>
                  <td className="py-1.5 pr-4">{formatClock(extremum.timeSec, zone)}</td>
                  <td className="py-1.5 pr-4">
                    {extremum.kind === 'pasang' ? dict.common.high : dict.common.low}
                  </td>
                  <td className="py-1.5 text-right">{extremum.heightM.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-reading text-caption text-inkFaint">
          {fill(dict.prediksi.provenance, {
            datum: record.datum.label,
            count: fit.constants.length,
            from: formatDateTime(fit.windowStartSec, zone),
            to: formatDateTime(fit.windowEndSec, zone),
            kappa: fit.conditionNumber.toFixed(2),
            rms: fit.residualRmsM.toFixed(4),
          })}
        </p>
      </section>
    </div>
  )
}
