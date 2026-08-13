import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NavigationWarning } from '@/components/NavigationWarning'
import { TideChart } from '@/components/chart/TideChart'
import { ConstituentTable } from '@/components/table/ConstituentTable'
import { FitDiagnostics, RefusalNotice } from '@/components/Diagnostics'
import { FitWindowControl } from '@/components/FitWindowControl'
import { LeakagePanel } from '@/components/LeakagePanel'
import { StationHeader, StationNav } from '@/components/StationNav'
import { Callout, Caption, Card, Section, Stat, TraceKey } from '@/components/ui'
import { dictionary, fill, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations, stationSummary } from '@/lib/records/registry'
import { buildChartModel } from '@/lib/chart/model'
import { DerivationPanel } from '@/components/DerivationPanel'
import { StabilityPanel } from '@/components/StabilityPanel'
import { windowStability } from '@/lib/tide/stability'
import { deriveConstituent, largestConstituent } from '@/lib/view/derivation'
import { pageMetadata } from '@/lib/view/metadata'
import { analyseStation } from '@/lib/view/station'
import { zoneOf } from '@/lib/view/format'

/** Two thirds fitted, one third held out and predicted (PRD §6.1). */
const FIT_FRACTION = 2 / 3

export async function generateMetadata({
  params,
}: {
  params: { locale: string; station: string }
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {}
  const locale = params.locale as Locale
  const dict = dictionary(locale)
  const station = stationSummary(params.station)
  if (station === undefined) return {}

  // The station's name and this view's own heading and lead — the same strings
  // the page renders, so the card cannot drift from the page.
  return pageMetadata({
    locale,
    path: `catatan/${station.stationId}`,
    title: `${station.stationName} — ${dict.catatan.title}`,
    // Prefixed with the station, which is this page's own h1 — otherwise
    // every station shares one view's lead and sixteen pages describe
    // themselves identically.
    description: `${station.stationName}. ${dict.catatan.lead}`,
  })
}

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

  /*
   * One constituent walked from timestamp to constant, on this record. The
   * largest one, because that is the one a reader has just been looking at on
   * the chart.
   */
  const derivation =
    shown.outcome.type === 'fit'
      ? (() => {
          const constant = largestConstituent(shown.outcome.constants)
          return constant === null
            ? null
            : deriveConstituent({
                record,
                constant,
                meanLevelM: shown.outcome.meanLevelM,
              })
        })()
      : null

  /*
   * Four independent stretches of the same record, so the page can say whether
   * its own constants move when the window does.
   */
  const stability =
    shown.outcome.type === 'fit'
      ? windowStability({
          record,
          constituents: shown.outcome.constants.map((c) => c.name),
        })
      : null

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
    <div className="space-y-section">
      {/*
       * The page's masthead: which station, which view, and the warning that
       * invariant 15 requires wherever a predicted height appears. One cluster
       * at a tight rhythm, so the section rhythm below can be generous without
       * pulling these three apart.
       */}
      <div className="space-y-4">
        <StationNav dict={dict} locale={locale} stationId={station.stationId} active="catatan" />
        <StationHeader
          dict={dict}
          station={station}
          datumLabel={record.datum.label}
          datumNote={record.datum.note}
          zone={zone}
          gapHours={summary.gapHours}
          character={
            analysis.character === null
              ? undefined
              : dict.tideType[analysis.character.type].label
          }
        />
        <NavigationWarning dict={dict} compact />
      </div>

      <Section eyebrow={dict.catatan.eyebrow} title={dict.catatan.title} lead={dict.catatan.lead}>
        <Card>
          <TraceKey
            items={[
              { colour: 'ink', label: dict.common.observed, meaning: dict.catatan.keyObserved },
              {
                colour: 'prediction',
                label: dict.common.predicted,
                meaning: dict.catatan.keyPredicted,
              },
              {
                colour: 'residual',
                label: dict.common.residual,
                meaning: dict.catatan.keyResidual,
              },
            ]}
          />
        </Card>

        <FitWindowControl
          dict={dict}
          stationId={station.stationId}
          stationName={station.stationName}
          constituents={
            shown.outcome.type === 'fit'
              ? shown.outcome.constants.map((c) => c.name)
              : analysis.requested
          }
          initialPercent={Math.round(FIT_FRACTION * 100)}
        >
          <div className="space-y-6">
            {primary.outcome.type === 'refusal' && (
              <>
                <RefusalNotice dict={dict} refusal={primary.outcome} />
                {fallback !== null && (
                  <p className="max-w-reading text-caption text-inkMuted">
                    {dict.catatan.fallbackNote}{' '}
                    <span className="numeric">{fallback.constituents.join(', ')}</span>.
                  </p>
                )}
                {/* A refusal with no accounting is just an absence. */}
                <LeakagePanel dict={dict} estimates={analysis.leakage} />
              </>
            )}

            {model !== null && (
              <figure className="card overflow-hidden p-4">
                <TideChart
                  model={model}
                  observedLabel={dict.common.observed}
                  predictedLabel={dict.common.predicted}
                  residualLabel={dict.common.residual}
                  heldOutLabel={dict.catatan.heldOut}
                  titleId="record-chart-title"
                  description={
                    fill(dict.common.chartAlt, {
                      station: station.stationName,
                      days: Math.round(station.lengthDays),
                      count:
                        shown.outcome.type === 'fit' ? shown.outcome.constants.length : 0,
                    }) +
                    (shown.fitResidualRmsM === null
                      ? ''
                      : fill(dict.common.chartAltRms, {
                          rms: shown.fitResidualRmsM.toFixed(4),
                        }))
                  }
                />
              </figure>
            )}

            {shown.outcome.type === 'fit' && (
              <>
                <FitDiagnostics
                  dict={dict}
                  fit={shown.outcome}
                  correlationHref={`/${locale}/komponen/${station.stationId}`}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <Stat
                      label={dict.catatan.fitRms}
                      value={shown.fitResidualRmsM?.toFixed(4) ?? '—'}
                      unit="m"
                      tone="residual"
                      note={dict.catatan.fitRmsNote}
                    />
                  </Card>
                  <Card>
                    <Stat
                      label={dict.catatan.heldOutRms}
                      value={shown.heldOutResidualRmsM?.toFixed(4) ?? '—'}
                      unit="m"
                      tone="residual"
                      note={dict.catatan.heldOutRmsNote}
                    />
                  </Card>
                </div>

                <Callout tone="note" title={dict.catatan.readingTitle}>
                  <p className="max-w-reading">{dict.catatan.readingBody}</p>
                </Callout>

                <Section eyebrow={dict.komponen.eyebrow} title={dict.komponen.title}>
                  <ConstituentTable dict={dict} constants={shown.outcome.constants} />
                  <Caption>{dict.komponen.tableCaption}</Caption>
            <Caption>{dict.komponen.tableUncertainty}</Caption>

                  {/*
                   * The step the site never showed. It belongs here, directly
                   * under the table it derives, rather than on the method page
                   * — a reader should be able to look up from the worked H and
                   * g to the row they reproduce.
                   */}
                  {/*
                   * The claim the site never tested: whether these constants
                   * belong to the harbour or to these particular months. It
                   * goes under the table it questions.
                   */}
                  {stability !== null && (
                    <Section
                      level={3}
                      eyebrow={dict.catatan.stabilityEyebrow}
                      title={dict.catatan.stabilityTitle}
                    >
                      <StabilityPanel dict={dict} report={stability} />
                    </Section>
                  )}

                  {derivation !== null && (
                    <Section
                      level={3}
                      eyebrow={dict.catatan.derivationEyebrow}
                      title={fill(dict.catatan.derivationTitle, { name: derivation.name })}
                    >
                      <DerivationPanel dict={dict} derivation={derivation} />
                    </Section>
                  )}
                </Section>
              </>
            )}
          </div>
        </FitWindowControl>
      </Section>

      <p className="text-caption">
        <Link
          href={`/${locale}/metode`}
          className="text-prediction underline underline-offset-4 hover:text-ink"
        >
          {dict.metode.title}
        </Link>
      </p>
    </div>
  )
}
