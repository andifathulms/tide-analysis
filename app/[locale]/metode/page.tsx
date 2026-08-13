import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NavigationWarning } from '@/components/NavigationWarning'
import type { ReactNode } from 'react'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { MANIFEST, stations } from '@/lib/records/registry'
import { CONSTITUENTS, constituentSpeed, STANDARD_SET } from '@/lib/tide/constituents'
import { constituentDoodsonNumber } from '@/lib/tide/constituents'
import { analyseStation } from '@/lib/view/station'
import { formatDate, formatDays } from '@/lib/view/format'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

/**
 * Split a dictionary template on a single `{key}` placeholder and put a node
 * in its place.
 *
 * Two sentences here need markup inside them — a book title in italics, a
 * command in mono — and the words either side of that markup fall in
 * different orders in the two languages. Keeping the whole sentence in the
 * dictionary and splicing the node in is the only way a translator can see
 * what they are translating.
 */
function splice(template: string, key: string, node: ReactNode): ReactNode {
  const [before = '', after = ''] = template.split(`{${key}}`)
  return (
    <>
      {before}
      {node}
      {after}
    </>
  )
}

/** PRD §6.8: which record, which source and licence, which constituents,
 *  which method, and what the residual RMS is. Linked from every plot. */
export default async function MethodPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)

  const analyses = await Promise.all(stations().map((s) => analyseStation(s.stationId)))

  return (
    <div className="space-y-section">
      <NavigationWarning dict={dict} />

      <header className="max-w-reading space-y-3">
        <p className="eyebrow">{dict.metode.eyebrow}</p>
        <h1 className="text-display">{dict.metode.title}</h1>
        <p className="text-lead text-inkMuted">{dict.metode.lead}</p>
      </header>

      <section className="max-w-reading space-y-3">
        <h2 className="text-headline">{dict.metode.astroTitle}</h2>
        <p>
          {splice(dict.metode.astroArguments, 'book', <em>Astronomical Algorithms</em>)}
        </p>
        <p>
          {splice(
            dict.metode.astroSpeeds,
            'command',
            <code className="numeric">pnpm test:astro</code>,
          )}
        </p>
        <p>{dict.metode.astroNodal}</p>
      </section>

      <section className="max-w-reading space-y-3">
        <h2 className="text-headline">{dict.metode.fitTitle}</h2>
        <p>{dict.metode.fitModel}</p>
        <p>{dict.metode.fitConditioning}</p>
        <p>{dict.metode.fitRayleigh}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-headline">{dict.metode.setTitle}</h2>
        <p className="max-w-reading text-caption text-inkMuted">
          {splice(
            dict.metode.setLead,
            'set',
            <span className="numeric">{STANDARD_SET.join(', ')}</span>,
          )}
        </p>
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] border-collapse text-caption">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="py-2 pr-4">{dict.common.constituent}</th>
                <th className="py-2 pr-4">{dict.metode.setDoodson}</th>
                <th className="py-2 pr-4 text-right">{dict.common.speed}</th>
                <th className="py-2 pr-4 text-right">{dict.common.period_h}</th>
                <th className="py-2">{dict.metode.setMeaning}</th>
              </tr>
            </thead>
            <tbody className="numeric">
              {CONSTITUENTS.map((constituent) => (
                <tr key={constituent.name} className="border-b border-rule/60">
                  <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                    {constituent.name}
                  </th>
                  <td className="py-1.5 pr-4">{constituentDoodsonNumber(constituent.name)}</td>
                  <td className="py-1.5 pr-4 text-right">
                    {constituentSpeed(constituent.name).toFixed(7)}
                  </td>
                  <td className="py-1.5 pr-4 text-right">
                    {(360 / constituentSpeed(constituent.name)).toFixed(3)}
                  </td>
                  <td className="py-1.5 text-caption">
                    {dict.constituentMeaning[constituent.name] ?? constituent.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-headline">{dict.metode.recordsTitle}</h2>
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] border-collapse text-caption">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="py-2 pr-4">{dict.common.station}</th>
                <th className="py-2 pr-4">{dict.common.period}</th>
                <th className="py-2 pr-4 text-right">{dict.common.days}</th>
                <th className="py-2 pr-4 text-right">{dict.common.gaps}</th>
                <th className="py-2 pr-4">{dict.common.datum}</th>
                <th className="py-2 pr-4 text-right">κ</th>
                <th className="py-2 text-right">{dict.common.residualRms}</th>
              </tr>
            </thead>
            <tbody className="numeric">
              {analyses.map((analysis) => {
                if (analysis === null) return null
                const outcome =
                  analysis.primary.outcome.type === 'fit'
                    ? analysis.primary.outcome
                    : (analysis.fallback?.analysis.outcome ?? null)
                return (
                  <tr key={analysis.station.stationId} className="border-b border-rule/60">
                    <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                      <Link
                        href={`/${locale}/catatan/${analysis.station.stationId}`}
                        className="hover:text-prediction"
                      >
                        {analysis.station.stationName}
                      </Link>
                    </th>
                    <td className="py-1.5 pr-4">
                      {formatDate(analysis.station.startSec)} —{' '}
                      {formatDate(analysis.station.endSec)}
                    </td>
                    <td className="py-1.5 pr-4 text-right">
                      {formatDays(analysis.station.lengthDays)}
                    </td>
                    <td className="py-1.5 pr-4 text-right">
                      {analysis.summary.gapCount} ({analysis.summary.gapHours.toFixed(0)}{' '}
                      {dict.metode.gapHoursUnit})
                    </td>
                    <td className="py-1.5 pr-4">{analysis.station.datumCode}</td>
                    <td className="py-1.5 pr-4 text-right">
                      {outcome !== null && outcome.type === 'fit'
                        ? outcome.conditionNumber.toFixed(2)
                        : '—'}
                    </td>
                    <td className="py-1.5 text-right text-residualText">
                      {outcome !== null && outcome.type === 'fit'
                        ? `${outcome.residualRmsM.toFixed(4)} m`
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="max-w-reading text-caption text-inkMuted">{dict.metode.recordsNote}</p>
      </section>

      <section className="max-w-reading space-y-3">
        <h2 className="text-headline">{dict.metode.admiraltyTitle}</h2>
        <p>{dict.metode.admiraltyBody}</p>
      </section>

      <section className="max-w-reading space-y-3">
        <h2 className="text-headline">{dict.metode.sourcesTitle}</h2>
        <ul className="space-y-3 text-caption">
          {MANIFEST.sources
            .filter((source) => source.id !== 'synthetic')
            .map((source) => (
              <li key={source.id} className="card p-4">
                <p className="font-medium">
                  {source.name}{' '}
                  <span className={source.enabled ? 'text-prediction' : 'text-unresolved'}>
                    ({source.enabled ? dict.metode.sourceActive : source.status})
                  </span>
                </p>
                {source.licence !== '' && (
                  <p className="mt-1">
                    {dict.common.licence}: {source.licence}
                  </p>
                )}
                {source.attribution !== '' && (
                  <p className="mt-1 text-inkMuted">{source.attribution}</p>
                )}
                <p className="mt-1 text-inkMuted">{source.note}</p>
                {source.termsUrl !== '' && (
                  <p className="mt-1">
                    <a
                      href={source.termsUrl}
                      className="text-prediction underline underline-offset-2"
                      rel="noreferrer"
                    >
                      {source.termsUrl}
                    </a>
                  </p>
                )}
              </li>
            ))}
        </ul>
      </section>
    </div>
  )
}
