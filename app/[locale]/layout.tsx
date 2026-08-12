import Link from 'next/link'
import { notFound } from 'next/navigation'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)
  const other: Locale = locale === 'id' ? 'en' : 'id'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-5 py-3">
          <Link href={`/${locale}`} className="group flex items-baseline gap-2.5">
            {/* A tide mark: two crests and a trough, drawn once. */}
            <svg
              width="26"
              height="16"
              viewBox="0 0 26 16"
              aria-hidden="true"
              className="shrink-0 text-prediction"
            >
              <path
                d="M1 11 C4 3, 8 3, 11 8 S18 13, 21 5 L25 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="prose-serif text-title text-ink group-hover:text-prediction">
              {dict.siteName}
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-caption">
            <Link
              href={`/${locale}`}
              className="rounded px-2.5 py-1.5 text-inkMuted hover:bg-sunken hover:text-ink"
            >
              {dict.nav.beranda}
            </Link>
            <Link
              href={`/${locale}/metode`}
              className="rounded px-2.5 py-1.5 text-inkMuted hover:bg-sunken hover:text-ink"
            >
              {dict.nav.metode}
            </Link>
            <Link
              href={`/${other}`}
              className="ml-1 rounded border border-rule px-2.5 py-1 text-micro font-medium uppercase tracking-wider text-inkFaint hover:border-prediction hover:text-prediction"
            >
              {other}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-page flex-1 px-5 py-8 sm:py-10">{children}</main>

      <footer className="mt-16 border-t border-rule bg-surface">
        <div className="mx-auto max-w-page space-y-3 px-5 py-8 text-caption text-inkMuted">
          <p className="max-w-reading">
            <span className="font-medium text-unresolved">{dict.warning.title}.</span>{' '}
            {dict.warning.official}
          </p>
          <p className="max-w-reading text-inkFaint">
            {dict.siteName} — {dict.tagline}. Sumber terbuka, tanpa server, tanpa jaringan saat
            dijalankan.
          </p>
        </div>
      </footer>
    </div>
  )
}
