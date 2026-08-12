import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FormzahlComparison, type FormzahlRow } from '@/components/FormzahlComparison'
import { NavigationWarning } from '@/components/NavigationWarning'
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

  return (
    <div className="space-y-8">
      <NavigationWarning dict={dict} />

      <section className="max-w-3xl">
        <p className="text-lg leading-relaxed">{dict.home.lead}</p>
      </section>

      <section className="max-w-3xl">
        <h2 className="text-xl">{dict.home.whyTitle}</h2>
        <ul className="mt-3 space-y-3 border-l-2 border-grid pl-4">
          {dict.home.why.map((line) => (
            <li key={line.slice(0, 24)}>{line}</li>
          ))}
        </ul>
      </section>

      {formzahl.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl">{dict.home.characterTitle}</h2>
          <p className="max-w-3xl text-sm text-traceInk/80">{dict.home.characterLead}</p>
          <FormzahlComparison dict={dict} locale={locale} rows={formzahl} />
        </section>
      )}

      <section>
        <h2 className="text-xl">{dict.home.stationsTitle}</h2>
        <p className="mt-1 max-w-3xl text-sm text-traceInk/70">{dict.home.stationsLead}</p>

        {list.length === 0 ? (
          <p className="mt-4 text-sm text-unresolved">
            Belum ada rekaman yang lolos gerbang lisensi. Jalankan <code>pnpm records:fetch</code>.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {list.map((station) => (
              <li key={station.stationId} className="card p-4">
                <Link
                  href={`/${locale}/catatan/${station.stationId}`}
                  className="text-lg font-medium hover:text-prediction"
                >
                  {station.stationName}
                </Link>
                <dl className="numeric mt-2 space-y-0.5 text-xs text-traceInk/70">
                  <div>
                    {formatDate(station.startSec)} — {formatDate(station.endSec)} ·{' '}
                    {formatDays(station.lengthDays)} {dict.common.days}
                  </div>
                  <div>
                    {station.sampleCount} {dict.common.samples} · {station.gapCount}{' '}
                    {dict.common.gaps}
                  </div>
                  <div>
                    {dict.common.datum}: {station.datumCode}
                  </div>
                </dl>
                <p className="control mt-2 text-xs text-traceInk/60">{station.sourceName}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {blocked.length > 0 && (
        <section className="max-w-3xl border-t border-grid pt-4">
          <h2 className="control text-sm uppercase tracking-wide text-traceInk/60">
            Sumber di balik gerbang lisensi
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {blocked.map((source) => (
              <li key={source.id}>
                <span className="font-medium">{source.name}</span>{' '}
                <span className="text-unresolved">({source.status})</span> — {source.note}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
