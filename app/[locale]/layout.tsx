import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BrandMark } from '@/components/BrandMark'
import { MakerSignature } from '@/components/MakerSignature'
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
  /** Each language names itself, in itself. */
  const otherName = other === 'en' ? 'English' : 'Bahasa Indonesia'

  /*
   * The document language, as close to the document as this router allows.
   *
   * <html> lives in the root layout, which has no locale param and cannot get
   * one — App Router requires html and body there, above the [locale] segment.
   * So every page shipped lang="id", and a screen reader read the whole
   * English site with Indonesian pronunciation rules (WCAG 3.1.1).
   *
   * Assistive technology honours lang on any element for its subtree, so
   * declaring it here fixes what a reader actually hears: everything inside is
   * the page. The root <html lang="id"> remains as the document default, which
   * is correct for the site as a whole — Indonesian is the primary language
   * (PRD §9) — and is what /id pages want anyway.
   */
  return (
    <div lang={locale} className="flex min-h-screen flex-col">
      {/*
       * Eight tab stops stand between the top of every page and its content —
       * three in the header, five more in the station nav — repeated across
       * ninety pages. WCAG 2.4.1.
       *
       * Screen reader users could already skip: <header>, <nav>, <main> and
       * <footer> are all native landmarks and were before this. It is
       * keyboard-only sighted users who had no mechanism, so this is the one
       * thing that adds, and it duplicates nothing they already have.
       */}
      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:absolute focus:left-gutter focus:top-3 focus:z-30 focus:rounded-card focus:bg-prediction focus:px-4 focus:py-2 focus:text-body focus:font-medium focus:text-surface focus:shadow-raised"
      >
        {dict.skipToContent}
      </a>

      <header className="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-gutter py-3">
          {/* The lockup: the mark, then the wordmark in the site's own serif. */}
          <Link href={`/${locale}`} className="group flex items-center gap-2.5">
            <BrandMark className="h-7 w-7 shrink-0 rounded-[6px]" />
            <span className="prose-serif text-title leading-none text-ink group-hover:text-prediction">
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
            {/*
             * The toggle was an 11px box in the faint ink at the far right —
             * effectively invisible to the reader who most needs it, since
             * the page it sits on is entirely in the language they cannot
             * read. It is now the same size as the links beside it and names
             * the language rather than abbreviating it.
             */}
            <Link
              href={`/${other}`}
              lang={other}
              hrefLang={other}
              aria-label={otherName}
              className="ml-1 rounded-card border border-rule px-2.5 py-1.5 text-caption font-medium text-inkMuted hover:border-prediction hover:text-prediction"
            >
              <span className="sm:hidden">{other.toUpperCase()}</span>
              <span className="hidden sm:inline">{otherName}</span>
            </Link>
          </nav>
        </div>
      </header>

      <main id="isi" className="mx-auto w-full max-w-page flex-1 px-gutter py-8 sm:py-10">
        {children}
      </main>

      <footer className="mt-section border-t border-rule bg-surface">
        <div className="mx-auto max-w-page px-gutter py-8 text-caption text-inkMuted">
          {/* The notice a reader must not miss, and what the site is. */}
          <p className="max-w-reading">
            <span className="font-medium text-unresolved">{dict.warning.title}.</span>{' '}
            {dict.warning.official}
          </p>

          {/* The bottom bar: what this is on the left, who made it on the
              right. One seam for the whole footer — the border above. */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <p className="max-w-reading text-inkFaint">
              {dict.siteName} — {dict.tagline}. Sumber terbuka, tanpa server, tanpa jaringan saat
              dijalankan.
            </p>
            <MakerSignature />
          </div>
        </div>
      </footer>
    </div>
  )
}
