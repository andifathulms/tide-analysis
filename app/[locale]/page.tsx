import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FormzahlComparison, type FormzahlRow } from '@/components/FormzahlComparison'
import { NavigationWarning } from '@/components/NavigationWarning'
import { TideChart } from '@/components/chart/TideChart'
import { StationAtlas } from '@/components/StationAtlas'
import { Badge, ButtonLink, Card, FormzahlSwatch, Section, Stat, TraceKey } from '@/components/ui'
import { buildAtlasModel } from '@/lib/chart/atlas'
import { GAUGE_LOCATIONS } from '@/lib/records/locations'
import { STAGES, viewsOf } from '@/lib/view/stages'
import { pageMetadata } from '@/lib/view/metadata'
import { dictionary, fill, isLocale, type Locale } from '@/lib/i18n/dictionary'
import { MANIFEST, stations } from '@/lib/records/registry'
import { formatDate, formatDays } from '@/lib/view/format'
import { heroChart } from '@/lib/view/hero'
import { analyseStation } from '@/lib/view/station'

/** Fitted at build time, one per bundled station. Nothing is quoted. */
async function formzahlRows(): Promise<FormzahlRow[]> {
  const analyses = await Promise.all(stations().map((s) => analyseStation(s.stationId)))
  const rows: FormzahlRow[] = []

  for (const analysis of analyses) {
    if (analysis === null) continue
    const shown =
      analysis.primary.outcome.type === 'fit' ? analysis.primary : analysis.fallback?.analysis
    if (shown === undefined || shown.formzahl === null || shown.formzahl.missing.length > 0) continue

    rows.push({
      stationId: analysis.station.stationId,
      stationName: analysis.station.stationName,
      value: shown.formzahl.value,
      label: shown.formzahl.label,
      description: shown.formzahl.description,
      type: shown.formzahl.type,
      M2: shown.formzahl.amplitudes.M2,
      S2: shown.formzahl.amplitudes.S2,
      K1: shown.formzahl.amplitudes.K1,
      O1: shown.formzahl.amplitudes.O1,
    })
  }

  return rows.sort((a, b) => a.value - b.value)
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {}
  const locale = params.locale as Locale
  const dict = dictionary(locale)
  return pageMetadata({
    locale,
    path: '',
    title: dict.home.heroTitle,
    description: dict.home.heroLead,
  })
}

export default async function HomeRoute({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  return <Home locale={params.locale as Locale} />
}

/**
 * The home page, as a component rather than only a route.
 *
 * The site root renders it too. `app/page.tsx` used to call redirect('/id'),
 * which a static export cannot perform — it emits an error shell with no meta
 * refresh and no link to anywhere, so the redirect happened only after React
 * hydrated. A crawler arriving at the front door found a page with a title, an
 * OG card and no way onward to any of the other eighty-eight.
 */
export async function Home({ locale }: { locale: Locale }) {
  const dict = dictionary(locale)
  const list = stations()
  const formzahl = await formzahlRows()
  const hero = await heroChart()
  const blocked = MANIFEST.sources.filter((s) => !s.enabled && s.id !== 'synthetic')

  const numberLocale = locale === 'id' ? 'id-ID' : 'en-GB'
  const accentStart = dict.home.heroTitle.lastIndexOf(dict.home.heroAccent)

  /* Every bundled station with a location and a fitted character. */
  const atlas = buildAtlasModel(
    formzahl.flatMap((row) => {
      const where = GAUGE_LOCATIONS[row.stationId]
      if (where === undefined) return []
      return [
        {
          stationId: row.stationId,
          name: where.mapName,
          lonDeg: where.lonDeg,
          latDeg: where.latDeg,
          formzahl: row.value,
          type: row.type,
          label: where.label,
        },
      ]
    }),
  )

  const totalDays = list.reduce((sum, s) => sum + s.lengthDays, 0)
  const totalSamples = list.reduce((sum, s) => sum + s.sampleCount, 0)

  // The station every "open a record" link points at: the one in the hero
  // chart, so the reader lands on the record they were just looking at.
  const entry = hero?.stationId ?? list[0]?.stationId
  const entryName = hero?.stationName ?? list[0]?.stationName

  const heroWindowDays =
    hero === null ? 0 : Math.round((hero.endSec - hero.startSec) / 86400)

  /*
   * Stations ordered by Formzahl rather than by name, so reading down the grid
   * walks the archipelago from two tides a day to one — the same progression
   * the comparison above it makes, in the same direction. Anything without a
   * fitted character sorts last; it has no place on that scale.
   */
  const ordered = list
    .map((station) => ({
      station,
      character: formzahl.find((row) => row.stationId === station.stationId),
    }))
    .sort((a, b) => (a.character?.value ?? Infinity) - (b.character?.value ?? Infinity))

  return (
    <div className="space-y-section">
      {/*
       * The hero says what this is in one breath, for a reader who has never
       * heard of a tidal constituent — and then shows it, because the subject
       * is an instrument and prose is a poor substitute for looking at one.
       *
       * It sits on the night band, the site's one bold surface, run edge to
       * edge: the chart is the most striking thing the project has and was
       * drawn at card scale. `.night` re-scopes the series tokens, so the
       * same TideChart reads against the band unchanged.
       */}
      <section className="night -mt-8 mx-[calc(50%-50vw)] border-b border-nightRule sm:-mt-10">
        <div className="mx-auto max-w-page space-y-8 px-gutter pb-10 pt-12 sm:pb-12 sm:pt-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end">
            <div className="space-y-5">
              <h1 className="max-w-[18ch] text-display sm:text-hero">
                {accentStart < 0 ? (
                  dict.home.heroTitle
                ) : (
                  <>
                    {dict.home.heroTitle.slice(0, accentStart)}
                    <span className="accent-serif text-prediction">{dict.home.heroAccent}</span>
                    {dict.home.heroTitle.slice(accentStart + dict.home.heroAccent.length)}
                  </>
                )}
              </h1>
              <p className="max-w-reading text-lead text-inkMuted">{dict.home.heroLead}</p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                {entry !== undefined && (
                  <ButtonLink href={`/${locale}/catatan/${entry}`}>
                    {dict.home.openStation} {entryName} <span aria-hidden="true">→</span>
                  </ButtonLink>
                )}
                <ButtonLink href={`/${locale}/metode`} variant="secondary">
                  {dict.home.readMethod}
                </ButtonLink>
              </div>
              <dl className="grid grid-cols-3 gap-4 border-t border-nightRule pt-5">
                <Stat label={dict.home.statStations} value={list.length} />
                <Stat
                  label={dict.home.statDays}
                  value={Math.round(totalDays).toLocaleString(numberLocale)}
                />
                <Stat label={dict.home.statSamples} value={totalSamples.toLocaleString(numberLocale)} />
              </dl>
            </div>
          </div>

          {hero !== null && (
            <figure className="space-y-4 border-t border-nightRule pt-6">
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
              <TideChart
                model={hero.model}
                observedLabel={dict.common.observed}
                predictedLabel={dict.common.predicted}
                residualLabel={dict.common.residual}
                titleId="hero-chart-title"
                drawIn
                description={
                  fill(dict.common.chartAlt, {
                    station: hero.stationName,
                    days: heroWindowDays,
                    count: hero.constituentCount,
                  }) +
                  (hero.residualRmsM === null
                    ? ''
                    : fill(dict.common.chartAltRms, { rms: hero.residualRmsM.toFixed(3) }))
                }
              />
              <figcaption className="text-caption text-inkFaint">
                {dict.home.heroChartNote}{' '}
                <Link href={`/${locale}/catatan/${hero.stationId}`} className="link">
                  {hero.stationName}
                </Link>
                {' · '}
                <span className="numeric">{heroWindowDays}</span> {dict.home.heroChartWindow}
                {hero.residualRmsM !== null && (
                  <>
                    {' · '}
                    {dict.common.residualRms}{' '}
                    <span className="numeric">{hero.residualRmsM.toFixed(3)} m</span>
                  </>
                )}
              </figcaption>
            </figure>
          )}

          {/* Invariant 15: the hero shows a predicted height, so the warning
              sits on the band beside it, not further down the page. */}
          <NavigationWarning dict={dict} />
        </div>
      </section>

      {/*
       * This was a fourth stat reading "Constants shipped: 0". It is the
       * project's central claim, but a large zero is the universal sign for
       * an empty dataset, and a stranger read it as the site being broken
       * rather than as the point. It says the same thing in words.
       */}
      <p className="max-w-reading text-lead text-inkMuted">{dict.home.computedClaim}</p>

      {/* Three steps, in words a reader without oceanography can follow. */}
      <Section eyebrow={dict.home.plainEyebrow} title={dict.home.plainTitle}>
        <ol className="grid gap-4 md:grid-cols-3">
          {dict.home.plainSteps.map((step, index) => (
            <Card as="li" key={step.title}>
              <span className="numeric text-caption text-inkFaint">0{index + 1}</span>
              <h3 className="mt-2 text-title">{step.title}</h3>
              <p className="mt-2 text-body text-inkMuted">{step.body}</p>
              {/*
               * Step two said the record is "taken apart" and stopped there —
               * an assertion with no number in it, on the page that is
               * supposed to make the claim. One real result from the station
               * already on screen turns it into something checkable two
               * clicks away.
               */}
              {index === 1 && hero?.largest != null && (
                <p className="mt-3 border-t border-rule pt-3 text-caption text-ink">
                  {fill(dict.home.plainExample, {
                    station: hero.stationName,
                    name: hero.largest.name,
                    amplitude: hero.largest.amplitudeM.toFixed(2),
                    lag: hero.largest.lagHours.toFixed(1),
                  })}
                </p>
              )}
            </Card>
          ))}
        </ol>
      </Section>

      {formzahl.length > 0 && (
        <Section
          eyebrow={dict.home.characterEyebrow}
          title={dict.home.characterTitle}
          lead={dict.home.characterLead}
        >
          <StationAtlas model={atlas} dict={dict} locale={locale} />
          <FormzahlComparison dict={dict} locale={locale} rows={formzahl} />
        </Section>
      )}

      <Section
        id="stasiun"
        eyebrow={dict.home.stationsEyebrow}
        title={dict.home.stationsTitle}
        lead={dict.home.stationsLead}
      >
        {list.length === 0 ? (
          <p className="text-body text-unresolved">
            {fill(dict.catatan.noRecords, { command: 'pnpm records:fetch' })}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map(({ station, character }) => (
              <Card as="li" key={station.stationId} className="flex flex-col justify-between">
                <div className="space-y-2">
                  <Link
                    href={`/${locale}/catatan/${station.stationId}`}
                    className="text-title font-bold tracking-tight text-ink hover:underline hover:underline-offset-4"
                  >
                    {station.stationName}
                  </Link>
                  {/*
                   * What the tide does here, promoted over the metadata. It
                   * was a caption under the name, outranked on every card by
                   * a datum code — the one fact a stranger cannot use and the
                   * third thing they read.
                   */}
                  {character !== undefined && (
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-ink">
                        <FormzahlSwatch type={character.type} />
                        {dict.tideType[character.type].label}
                      </span>
                      <span className="numeric text-caption text-inkFaint">
                        F {character.value.toFixed(2)}
                      </span>
                    </p>
                  )}
                </div>
                {/* Provenance, quiet but never absent: invariant 9 keeps the
                    datum on the record wherever the record is shown. */}
                <p className="numeric mt-4 border-t border-rule pt-3 text-caption text-inkFaint">
                  {formatDate(station.startSec)} — {formatDate(station.endSec)} ·{' '}
                  {formatDays(station.lengthDays)} {dict.common.days} · {dict.common.datum}{' '}
                  {station.datumCode}
                </p>
              </Card>
            ))}
          </ul>
        )}
      </Section>

      {/*
       * The station workspace, as its four stages. They are a sequence — the
       * inverse problem in order — so they are numbered; the number is the
       * same one the stage bar carries on every station page.
       */}
      {entry !== undefined && (
        <Section eyebrow={dict.home.toolsEyebrow} title={dict.home.toolsTitle}>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((stage, index) => (
              <Card as="li" key={stage} className="flex flex-col gap-2">
                <span className="numeric text-caption text-inkFaint">{index + 1}</span>
                <Link
                  href={`/${locale}/${viewsOf(stage)[0] ?? 'catatan'}/${entry}`}
                  className="text-title font-bold tracking-tight text-ink hover:underline hover:underline-offset-4"
                >
                  {dict.stages[stage].title}
                </Link>
                <p className="text-caption font-semibold text-inkFaint">{dict.stages[stage].detail}</p>
                {viewsOf(stage).map((view) => (
                  <p key={view} className="text-body text-inkMuted">
                    {dict.home.tools[view]}
                  </p>
                ))}
              </Card>
            ))}
          </ol>
        </Section>
      )}

      {blocked.length > 0 && (
        <Section eyebrow={dict.home.gateEyebrow} title={dict.home.gateTitle} lead={dict.home.gateLead}>
          <ul className="space-y-3">
            {blocked.map((source) => (
              <li key={source.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Badge tone="unresolved">{source.status}</Badge>
                <span className="text-body font-medium">{source.name}</span>
                <span className="max-w-reading text-caption text-inkMuted">{source.note}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
