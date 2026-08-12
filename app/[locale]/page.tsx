import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FormzahlComparison, type FormzahlRow } from '@/components/FormzahlComparison'
import { NavigationWarning } from '@/components/NavigationWarning'
import { Badge, Card, Section, Stat } from '@/components/ui'
import { dictionary, isLocale, type Locale } from '@/lib/i18n/dictionary'
import { MANIFEST, stations } from '@/lib/records/registry'
import { formatDate, formatDays } from '@/lib/view/format'
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

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)
  const list = stations()
  const formzahl = await formzahlRows()
  const blocked = MANIFEST.sources.filter((s) => !s.enabled && s.id !== 'synthetic')

  const totalDays = list.reduce((sum, s) => sum + s.lengthDays, 0)
  const totalSamples = list.reduce((sum, s) => sum + s.sampleCount, 0)

  return (
    <div className="space-y-16">
      {/* The hero says what this is in one breath, for a reader who has never
          heard of a tidal constituent. */}
      <section className="space-y-6 pt-2">
        <div className="max-w-3xl space-y-4">
          <Badge tone="prediction">{dict.tagline}</Badge>
          <h1 className="text-display sm:text-hero">{dict.home.heroTitle}</h1>
          <p className="max-w-reading text-lead text-inkMuted">{dict.home.heroLead}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {list[0] !== undefined && (
            <Link
              href={`/${locale}/catatan/${list[0].stationId}`}
              className="rounded-card bg-prediction px-5 py-2.5 text-caption font-medium text-surface shadow-card hover:bg-ink"
            >
              {dict.home.openFirstStation}
            </Link>
          )}
          <Link
            href={`/${locale}/metode`}
            className="rounded-card border border-rule bg-surface px-5 py-2.5 text-caption font-medium text-ink hover:border-prediction hover:text-prediction"
          >
            {dict.metode.title}
          </Link>
        </div>

        <dl className="grid max-w-2xl grid-cols-2 gap-6 border-t border-rule pt-5 sm:grid-cols-4">
          <Stat label={dict.home.statStations} value={list.length} />
          <Stat label={dict.home.statDays} value={Math.round(totalDays)} unit="hari" />
          <Stat label={dict.home.statSamples} value={totalSamples.toLocaleString('id-ID')} />
          <Stat label={dict.home.statConstants} value="0" note={dict.home.statConstantsNote} />
        </dl>
      </section>

      <NavigationWarning dict={dict} />

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
            {list.map((station) => {
              const character = formzahl.find((row) => row.stationId === station.stationId)
              return (
                <Card as="li" key={station.stationId} className="flex flex-col justify-between">
                  <div>
                    <Link
                      href={`/${locale}/catatan/${station.stationId}`}
                      className="prose-serif text-title text-ink hover:text-prediction"
                    >
                      {station.stationName}
                    </Link>
                    {character !== undefined && (
                      <p className="mt-1 text-caption text-inkMuted">{character.label}</p>
                    )}
                  </div>
                  <dl className="numeric mt-4 space-y-1 border-t border-rule pt-3 text-caption text-inkFaint">
                    <div className="flex justify-between gap-3">
                      <dt>{dict.common.period}</dt>
                      <dd>
                        {formatDate(station.startSec)} — {formatDate(station.endSec)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{dict.common.samples}</dt>
                      <dd>
                        {station.sampleCount} · {formatDays(station.lengthDays)} {dict.common.days}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{dict.common.datum}</dt>
                      <dd>{station.datumCode}</dd>
                    </div>
                  </dl>
                </Card>
              )
            })}
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
