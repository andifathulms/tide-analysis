import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FormzahlComparison, type FormzahlRow } from '@/components/FormzahlComparison'
import { NavigationWarning } from '@/components/NavigationWarning'
import { TideChart } from '@/components/chart/TideChart'
import { Badge, Card, Section, Stat, TraceKey } from '@/components/ui'
import { dictionary, isLocale, type Locale } from '@/lib/i18n/dictionary'
import { MANIFEST, stations } from '@/lib/records/registry'
import { formatDate, formatDays } from '@/lib/view/format'
import { heroChart } from '@/lib/view/hero'
import { analyseStation } from '@/lib/view/station'

/** The five views, in the order a reader should meet them. */
const TOOLS = ['catatan', 'komponen', 'resolusi', 'banding', 'prediksi'] as const

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

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)
  const list = stations()
  const formzahl = await formzahlRows()
  const hero = await heroChart()
  const blocked = MANIFEST.sources.filter((s) => !s.enabled && s.id !== 'synthetic')

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
      {/* The hero says what this is in one breath, for a reader who has never
          heard of a tidal constituent — and then shows it, because the subject
          is an instrument and prose is a poor substitute for looking at one. */}
      <section className="space-y-block pt-2">
        <div className="max-w-3xl space-y-4">
          <Badge tone="prediction">{dict.tagline}</Badge>
          <h1 className="text-display sm:text-hero">{dict.home.heroTitle}</h1>
          <p className="max-w-reading text-lead text-inkMuted">{dict.home.heroLead}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {entry !== undefined && (
            <Link
              href={`/${locale}/catatan/${entry}`}
              className="rounded-card bg-prediction px-5 py-2.5 text-body font-medium text-surface shadow-card hover:bg-ink"
            >
              {dict.home.openStation} {entryName}
            </Link>
          )}
          <Link
            href={`/${locale}/metode`}
            className="rounded-card border border-rule bg-surface px-5 py-2.5 text-body font-medium text-ink hover:border-prediction hover:text-prediction"
          >
            {dict.home.readMethod}
          </Link>
        </div>

        {hero !== null && (
          <figure className="card space-y-4 overflow-hidden p-card">
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
            />
            <figcaption className="text-caption text-inkFaint">
              {dict.home.heroChartNote}{' '}
              <Link
                href={`/${locale}/catatan/${hero.stationId}`}
                className="text-prediction underline underline-offset-4 hover:text-ink"
              >
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
      </section>

      {/* Invariant 15: the hero now shows a predicted height, so the warning
          belongs beside it rather than further down the page. */}
      <NavigationWarning dict={dict} />

      <section className="space-y-4">
        <dl className="grid max-w-2xl grid-cols-2 gap-block border-t border-rule pt-5 sm:grid-cols-3">
          <Stat label={dict.home.statStations} value={list.length} />
          <Stat label={dict.home.statDays} value={Math.round(totalDays)} unit={dict.common.days} />
          <Stat label={dict.home.statSamples} value={totalSamples.toLocaleString('id-ID')} />
        </dl>
        {/*
         * This was a fourth stat reading "Constants shipped: 0". It is the
         * project's central claim, but a large zero is the universal sign for
         * an empty dataset, and a stranger read it as the site being broken
         * rather than as the point. It says the same thing in words.
         */}
        <p className="max-w-reading text-body text-inkMuted">{dict.home.computedClaim}</p>
      </section>

      {entry !== undefined && (
        <Section eyebrow={dict.home.toolsEyebrow} title={dict.home.toolsTitle}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((segment) => (
              <Card as="li" key={segment}>
                <Link
                  href={
                    // Resolution has an index of its own: the separation
                    // ladder needs no station, and it lists the stations at
                    // the foot of the page rather than presuming one.
                    segment === 'resolusi'
                      ? `/${locale}/resolusi`
                      : `/${locale}/${segment}/${entry}`
                  }
                  className="prose-serif text-title text-ink hover:text-prediction"
                >
                  {dict.nav[segment]}
                </Link>
                <p className="mt-2 text-body text-inkMuted">{dict.home.tools[segment]}</p>
              </Card>
            ))}
          </ul>
        </Section>
      )}

      {/* Three steps, in words a reader without oceanography can follow. */}
      <Section eyebrow={dict.home.plainEyebrow} title={dict.home.plainTitle}>
        <ol className="grid gap-4 md:grid-cols-3">
          {dict.home.plainSteps.map((step, index) => (
            <Card as="li" key={step.title}>
              <span className="numeric text-caption text-prediction">0{index + 1}</span>
              <h3 className="mt-2 text-title">{step.title}</h3>
              <p className="mt-2 text-body text-inkMuted">{step.body}</p>
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
          <FormzahlComparison dict={dict} locale={locale} rows={formzahl} />
        </Section>
      )}

      <Section
        eyebrow={dict.home.stationsEyebrow}
        title={dict.home.stationsTitle}
        lead={dict.home.stationsLead}
      >
        {list.length === 0 ? (
          <p className="text-body text-unresolved">
            Belum ada rekaman yang lolos gerbang lisensi. Jalankan <code>pnpm records:fetch</code>.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map(({ station, character }) => (
              <Card as="li" key={station.stationId} className="flex flex-col justify-between">
                <div className="space-y-2">
                  <Link
                    href={`/${locale}/catatan/${station.stationId}`}
                    className="prose-serif text-title text-ink hover:text-prediction"
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
                      <Badge tone="prediction">{dict.tideType[character.type].label}</Badge>
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
