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
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-grid pb-4">
        <div>
          <Link href={`/${locale}`} className="text-2xl font-medium tracking-tight">
            {dict.siteName}
          </Link>
          <p className="control mt-0.5 text-sm text-traceInk/70">{dict.tagline}</p>
        </div>
        <nav className="control flex items-center gap-4 text-sm">
          <Link href={`/${locale}`} className="hover:text-prediction">
            {dict.nav.beranda}
          </Link>
          <Link href={`/${locale}/metode`} className="hover:text-prediction">
            {dict.nav.metode}
          </Link>
          <Link href={`/${other}`} className="text-traceInk/60 hover:text-prediction">
            {other.toUpperCase()}
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="control mt-12 border-t border-grid pt-4 text-xs text-traceInk/60">
        <p>
          {dict.warning.title}. {dict.warning.official}
        </p>
        <p className="mt-1">
          Pasut — {dict.tagline}. Sumber terbuka, tanpa server, tanpa jaringan saat dijalankan.
        </p>
      </footer>
    </div>
  )
}
