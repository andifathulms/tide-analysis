import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NavigationWarning } from '@/components/NavigationWarning'
import { TideChart } from '@/components/chart/TideChart'
import { ConstituentTable } from '@/components/table/ConstituentTable'
import { FitDiagnostics, RefusalNotice } from '@/components/Diagnostics'
import { StationHeader, StationNav } from '@/components/StationNav'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations } from '@/lib/records/registry'
import { buildChartModel } from '@/lib/chart/model'
import { analyseStation } from '@/lib/view/station'
import { zoneOf } from '@/lib/view/format'

/** Two thirds fitted, one third held out and predicted (PRD §6.1). */
const FIT_FRACTION = 2 / 3

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    stations().map((station) => ({ locale, station: station.stationId })),
  )
}

export default async function RecordPage({
  params,
}: {
  params: { locale: string; station: string }
}) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)

  const analysis = await analyseStation(params.station, { fitFraction: FIT_FRACTION })
  if (analysis === null) notFound()

  const { station, record, primary, fallback, summary } = analysis
  const shown = primary.outcome.type === 'fit' ? primary : (fallback?.analysis ?? primary)
  const zone = zoneOf(record)

  const model =
    shown.series === null
      ? null
      : buildChartModel({
          timesSec: shown.series.timesSec,
          observedM: shown.series.observedM,
          modelM: shown.series.modelM,
          residualM: shown.series.residualM,
          intervalSec: record.intervalSec,
          width: 1100,
          chartHeight: 340,
          residualHeight: 150,
          datums: [
            {
              label: `Z₀ ${record.datum.code}`,
              heightM: shown.outcome.type === 'fit' ? shown.outcome.meanLevelM : 0,
              emphasis: true,
            },
          ],
          fitWindow: shown.fitWindow,
          heldOutWindow: shown.heldOutWindow,
          datumSteps: shown.outcome.type === 'fit' ? shown.outcome.steps : [],
        })

  return (
    <div className="space-y-6">
      <StationNav dict={dict} locale={locale} stationId={station.stationId} active="catatan" />
      <StationHeader
        dict={dict}
        station={station}
        datumLabel={record.datum.label}
        datumNote={record.datum.note}
        zone={zone}
        gapHours={summary.gapHours}
      />
      <NavigationWarning dict={dict} />

      <p className="max-w-3xl">{dict.catatan.lead}</p>

      {primary.outcome.type === 'refusal' && (
        <>
          <RefusalNotice dict={dict} refusal={primary.outcome} />
          {fallback !== null && (
            <p className="max-w-3xl text-sm text-traceInk/70">
              Yang ditampilkan di bawah adalah himpunan terbesar yang masih didukung rekaman ini:{' '}
              <span className="numeric">{fallback.constituents.join(', ')}</span>.
            </p>
          )}
        </>
      )}

      {model !== null && (
        <div className="card p-4">
          <TideChart
            model={model}
            observedLabel={dict.common.observed}
            predictedLabel={dict.common.predicted}
            residualLabel={dict.common.residual}
            heldOutLabel={dict.catatan.heldOut}
          />
        </div>
      )}

      {shown.outcome.type === 'fit' && (
        <>
          <FitDiagnostics dict={dict} fit={shown.outcome} />

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <h2 className="control text-xs uppercase tracking-wide text-traceInk/60">
                RMS residu — jendela pencocokan
              </h2>
              <p className="numeric text-2xl text-residual">
                {shown.fitResidualRmsM?.toFixed(4)} m
              </p>
            </div>
            <div className="card p-4">
              <h2 className="control text-xs uppercase tracking-wide text-traceInk/60">
                RMS residu — jendela validasi (tidak dilihat saat mencocokkan)
              </h2>
              <p className="numeric text-2xl text-residual">
                {shown.heldOutResidualRmsM === null
                  ? '—'
                  : `${shown.heldOutResidualRmsM.toFixed(4)} m`}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl">{dict.komponen.title}</h2>
            <div className="mt-3">
              <ConstituentTable dict={dict} constants={shown.outcome.constants} />
            </div>
            <p className="mt-3 text-sm">
              <Link
                href={`/${locale}/metode`}
                className="control text-prediction underline underline-offset-2"
              >
                {dict.metode.title}
              </Link>
            </p>
          </section>
        </>
      )}
    </div>
  )
}
