import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NavigationWarning } from '@/components/NavigationWarning'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { MANIFEST, stations } from '@/lib/records/registry'
import { CONSTITUENTS, constituentSpeed, STANDARD_SET } from '@/lib/tide/constituents'
import { constituentDoodsonNumber } from '@/lib/tide/constituents'
import { analyseStation } from '@/lib/view/station'
import { formatDate, formatDays } from '@/lib/view/format'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

/** PRD §6.8: which record, which source and licence, which constituents,
 *  which method, and what the residual RMS is. Linked from every plot. */
export default async function MethodPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)

  const analyses = await Promise.all(stations().map((s) => analyseStation(s.stationId)))

  return (
    <div className="space-y-12">
      <NavigationWarning dict={dict} />

      <header className="max-w-reading space-y-3">
        <p className="eyebrow">Pengungkapan</p>
        <h1 className="text-display">{dict.metode.title}</h1>
        <p className="text-lead text-inkMuted">{dict.metode.lead}</p>
      </header>

      <section className="max-w-reading space-y-3">
        <h2 className="text-headline">Astronomi</h2>
        <p>
          Argumen kesetimbangan setiap komponen dihitung dari formulasi Doodson atas enam argumen
          astronomi: waktu bulan rata-rata τ, bujur rata-rata Bulan s, bujur rata-rata Matahari h,
          bujur perigee bulan p, bujur simpul naik N, dan bujur perihelion p′. Polinomialnya diambil
          dari Meeus, <em>Astronomical Algorithms</em> (ed. 2), bab 22, 25, dan 47.
        </p>
        <p>
          Kecepatan komponen diturunkan dari laju perubahan keenam elemen itu — tidak ada satu pun
          frekuensi yang ditulis sebagai angka mati di dalam kode. Uji <code>pnpm test:astro</code>{' '}
          membandingkannya dengan tabel terbit Schureman (1958) sampai 1e-6 °/jam.
        </p>
        <p>
          Koreksi nodal f dan u mengikuti deret ringkas Schureman sebagaimana disajikan Pugh (1987)
          tabel 4:2, dievaluasi di tengah jendela pencocokan. Nilainya ditampilkan di tabel
          komponen, tidak dilebur diam-diam ke dalam konstanta.
        </p>
      </section>

      <section className="max-w-reading space-y-3">
        <h2 className="text-headline">Pencocokan</h2>
        <p>
          Model tinggi muka laut adalah η(t) = Z₀ + Σ f·H·cos(V(t) + u − g). Model ini linear
          terhadap pasangan (a, b) = f·H·(cos g, sin g), sehingga penyelesaiannya adalah kuadrat
          terkecil biasa. Matriks normal AᵀA didiagonalkan dengan rotasi Jacobi siklik; dari situ
          diperoleh sekaligus penyelesaian, nilai singular A, dan bilangan kondisi κ = σmaks/σmin.
        </p>
        <p>
          κ adalah bagian wajib dari hasil, bukan diagnostik opsional. Ambangnya: κ &lt; 10 baik,
          &lt; 100 wajar, &lt; 1000 marginal, selebihnya buruk.
        </p>
        <p>
          Kriteria Rayleigh ditegakkan sebelum penyelesaian. Dua komponen hanya dapat dipisahkan
          bila rekaman mencapai T = 360° / |σᵢ − σⱼ|; bila tidak, permintaan ditolak dengan menyebut
          pasangan yang bentrok dan panjang rekaman yang dibutuhkan. Tidak ada jalur yang
          mengembalikan amplitudo tak stabil seolah-olah hasil.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-headline">Himpunan komponen</h2>
        <p className="max-w-reading text-caption text-inkMuted">
          Himpunan baku yang diminta pada setiap stasiun:{' '}
          <span className="numeric">{STANDARD_SET.join(', ')}</span>. Seluruh komponen yang
          didefinisikan proyek ini:
        </p>
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] border-collapse text-caption">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="py-2 pr-4">{dict.common.constituent}</th>
                <th className="py-2 pr-4">Doodson</th>
                <th className="py-2 pr-4 text-right">{dict.common.speed}</th>
                <th className="py-2 pr-4 text-right">{dict.common.period_h}</th>
                <th className="py-2">Keterangan</th>
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
                  <td className="py-1.5 text-caption">{constituent.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-headline">Rekaman dan hasilnya</h2>
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
                      {analysis.summary.gapCount} ({analysis.summary.gapHours.toFixed(0)} j)
                    </td>
                    <td className="py-1.5 pr-4">{analysis.station.datumCode}</td>
                    <td className="py-1.5 pr-4 text-right">
                      {outcome !== null && outcome.type === 'fit'
                        ? outcome.conditionNumber.toFixed(2)
                        : '—'}
                    </td>
                    <td className="py-1.5 text-right text-residual">
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
        <p className="max-w-reading text-caption text-inkMuted">
          Residu adalah selisih pengamatan dikurangi model. Ia memuat cuaca, surge, dan segala yang
          tidak dijelaskan model harmonik, dan RMS-nya adalah ukuran jujur atas mutu pencocokan.
          Residu tidak pernah disembunyikan atau dihaluskan.
        </p>
      </section>

      <section className="max-w-reading space-y-3">
        <h2 className="text-headline">Metode Admiralty</h2>
        <p>
          Skema Admiralty di sini memproyeksikan rekaman ke argumen tiap komponen satu per satu,
          lalu menyimpulkan K2 dari S2 (rasio 0,27) dan P1 dari K1 (rasio 0,331) memakai hubungan
          inferensi klasik. Ini bukan reproduksi tabulasi cetak NP 159 lengkap dengan pengali
          penyaringnya, dan setiap konstanta ditandai langsung atau disimpulkan.
        </p>
      </section>

      <section className="max-w-reading space-y-3">
        <h2 className="text-headline">Sumber data dan lisensi</h2>
        <ul className="space-y-3 text-caption">
          {MANIFEST.sources
            .filter((source) => source.id !== 'synthetic')
            .map((source) => (
              <li key={source.id} className="card p-4">
                <p className="font-medium">
                  {source.name}{' '}
                  <span className={source.enabled ? 'text-prediction' : 'text-unresolved'}>
                    ({source.enabled ? 'aktif' : source.status})
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
