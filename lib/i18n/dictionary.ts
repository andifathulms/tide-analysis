/**
 * Indonesian first, English second (PRD §9). Constituent names and standard
 * oceanographic terms stay in their conventional form in both.
 */

export const LOCALES = ['id', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'id'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

export interface Dictionary {
  readonly siteName: string
  readonly tagline: string
  readonly nav: {
    readonly beranda: string
    readonly catatan: string
    readonly komponen: string
    readonly resolusi: string
    readonly banding: string
    readonly prediksi: string
    readonly metode: string
  }
  readonly warning: {
    readonly title: string
    readonly body: string
    readonly official: string
  }
  readonly common: {
    readonly station: string
    readonly source: string
    readonly licence: string
    readonly datum: string
    readonly period: string
    readonly days: string
    readonly samples: string
    readonly gaps: string
    readonly amplitude: string
    readonly phase: string
    readonly speed: string
    readonly period_h: string
    readonly constituent: string
    readonly conditionNumber: string
    readonly residualRms: string
    readonly meanLevel: string
    readonly unresolved: string
    readonly resolved: string
    readonly observed: string
    readonly predicted: string
    readonly residual: string
    readonly nodalF: string
    readonly nodalU: string
    readonly method: string
    readonly leastSquares: string
    readonly admiralty: string
    readonly loading: string
    readonly refusal: string
    readonly recordLength: string
    readonly requiredLength: string
    readonly high: string
    readonly low: string
    readonly time: string
    readonly height: string
    readonly determination: string
    readonly direct: string
    readonly inferred: string
    readonly uncertainty: string
    readonly provenance: string
  }
  readonly conditioning: Record<'baik' | 'wajar' | 'marginal' | 'buruk', string>
  readonly home: {
    readonly heroTitle: string
    readonly heroLead: string
    readonly plainTitle: string
    readonly plainSteps: readonly { readonly title: string; readonly body: string }[]
    readonly lead: string
    readonly whyTitle: string
    readonly why: readonly string[]
    readonly stationsTitle: string
    readonly stationsLead: string
    readonly characterTitle: string
    readonly characterLead: string
    readonly plainEyebrow: string
    readonly characterEyebrow: string
    readonly stationsEyebrow: string
    readonly gateEyebrow: string
    readonly gateTitle: string
    readonly gateLead: string
    readonly openStation: string
    readonly readMethod: string
    readonly heroChartNote: string
    readonly heroChartWindow: string
    readonly statStations: string
    readonly statDays: string
    readonly statSamples: string
    readonly computedClaim: string
    readonly toolsEyebrow: string
    readonly toolsTitle: string
    /** One line per view, keyed by its route segment. */
    readonly tools: Record<
      'catatan' | 'komponen' | 'resolusi' | 'banding' | 'prediksi',
      string
    >
  }
  readonly catatan: {
    readonly title: string
    readonly lead: string
    readonly fitWindow: string
    readonly validationWindow: string
    readonly heldOut: string
    readonly splitLabel: string
    readonly splitHint: string
    readonly fitRms: string
    readonly heldOutRms: string
    readonly eyebrow: string
    readonly keyObserved: string
    readonly keyPredicted: string
    readonly keyResidual: string
    readonly fitRmsNote: string
    readonly heldOutRmsNote: string
    readonly readingTitle: string
    readonly readingBody: string
    readonly fallbackNote: string
  }
  readonly komponen: {
    readonly eyebrow: string
    readonly tableCaption: string
    readonly asymmetryTitle: string
    readonly asymmetryLead: string
    readonly asymmetryEyebrow: string
    readonly asymmetryShallow: string
    readonly asymmetryActual: string
    readonly asymmetryDisagree: string
    readonly asymmetryRatio: string
    readonly asymmetryPhase: string
    readonly rise: string
    readonly fall: string
    readonly title: string
    readonly lead: string
    readonly explorerTitle: string
    readonly explorerLead: string
    readonly formzahlTitle: string
    readonly publishedTitle: string
  }
  readonly resolusi: {
    readonly title: string
    readonly lead: string
    readonly sliderLabel: string
    readonly keptTitle: string
    readonly droppedTitle: string
    readonly conditionTitle: string
  }
  readonly banding: {
    readonly title: string
    readonly lead: string
    readonly difference: string
  }
  readonly prediksi: {
    readonly title: string
    readonly lead: string
    readonly extremaTitle: string
  }
  readonly metode: {
    readonly title: string
    readonly lead: string
  }
}

const id: Dictionary = {
  siteName: 'Tide Analysis',
  tagline: 'Analisis harmonik pasang surut dari pengamatan nyata',
  nav: {
    beranda: 'Beranda',
    catatan: 'Catatan',
    komponen: 'Komponen',
    resolusi: 'Resolusi',
    banding: 'Banding',
    prediksi: 'Prediksi',
    metode: 'Metode',
  },
  warning: {
    title: 'Bukan untuk navigasi',
    body:
      'Alat ini bersifat edukatif. Angkanya dihitung dari rekaman mentah yang tidak melalui kendali mutu, dan tidak boleh dipakai untuk pelayaran atau keselamatan.',
    official: 'Tabel pasang surut resmi Indonesia diterbitkan oleh Pushidrosal.',
  },
  common: {
    station: 'Stasiun',
    source: 'Sumber',
    licence: 'Lisensi',
    datum: 'Datum',
    period: 'Periode',
    days: 'hari',
    samples: 'sampel',
    gaps: 'jeda',
    amplitude: 'Amplitudo H (m)',
    phase: 'Fase g (°)',
    speed: 'Kecepatan (°/jam)',
    period_h: 'Periode (jam)',
    constituent: 'Komponen',
    conditionNumber: 'Bilangan kondisi κ',
    residualRms: 'RMS residu',
    meanLevel: 'Muka air rata-rata Z₀',
    unresolved: 'Tak terpisahkan',
    resolved: 'Terpisahkan',
    observed: 'Pengamatan',
    predicted: 'Prediksi',
    residual: 'Residu',
    nodalF: 'Faktor nodal f',
    nodalU: 'Koreksi nodal u (°)',
    method: 'Metode',
    leastSquares: 'Kuadrat terkecil',
    admiralty: 'Admiralty',
    loading: 'Menghitung…',
    refusal: 'Permintaan ditolak',
    recordLength: 'Panjang rekaman',
    requiredLength: 'Panjang yang dibutuhkan',
    high: 'Pasang',
    low: 'Surut',
    time: 'Waktu',
    height: 'Tinggi',
    determination: 'Penentuan',
    direct: 'Langsung',
    inferred: 'Disimpulkan',
    uncertainty: 'Ketidakpastian 1σ',
    provenance: 'Sumber, lisensi, dan catatan datum',
  },
  conditioning: {
    baik: 'baik',
    wajar: 'wajar',
    marginal: 'marginal',
    buruk: 'buruk — angka di bawah ini tidak dapat dipercaya',
  },
  home: {
    heroTitle: 'Pasang surut, dihitung dari air laut yang sebenarnya',
    heroLead:
      'Lihat pasang surut pelabuhan-pelabuhan Indonesia diurai menjadi gelombang penyusunnya, lalu diramalkan ke depan. Semua angkanya dihitung di sini, bukan disalin dari tabel.',
    plainTitle: 'Cara kerjanya, dalam tiga langkah',
    plainSteps: [
      {
        title: 'Air laut direkam',
        body: 'Alat di pelabuhan mencatat tinggi air setiap jam selama tujuh bulan. Itulah garis hitam pada grafik: apa adanya, termasuk cuaca dan gangguan alat.',
      },
      {
        title: 'Rekaman diuraikan',
        body: 'Pasang surut adalah jumlah dari gelombang-gelombang berirama tetap yang datang dari Bulan dan Matahari. Kami mencari seberapa besar dan seberapa telat tiap gelombang di tempat itu.',
      },
      {
        title: 'Sisanya ditampilkan apa adanya',
        body: 'Yang tidak bisa dijelaskan gelombang-gelombang tadi — cuaca, angin, gelombang badai — tidak disembunyikan. Ia digambar sebagai pita tersendiri di bawah grafik.',
      },
    ],
    lead:
      'Tinggi pasang surut adalah jumlah kosinus. Frekuensinya astronomis dan universal — M2 berperiode 12,42 jam di Balikpapan sama seperti di Bristol. Yang bersifat lokal hanya amplitudo dan fase, dan keduanya diperoleh dengan mencocokkan rekaman pengamatan, bukan dengan menyalin tabel.',
    whyTitle: 'Mengapa analisis, bukan pencarian tabel',
    why: [
      'Konstanta di sini selalu dihitung dari rekaman. Tidak ada satu pun tabel konstanta harmonik yang dikirim sebagai data.',
      'Kriteria Rayleigh ditegakkan sebelum penyelesaian. Bila rekaman terlalu pendek untuk memisahkan sepasang komponen, permintaan ditolak dengan menyebut pasangannya dan panjang rekaman yang dibutuhkan.',
      'Setiap penyelesaian melaporkan bilangan kondisinya. Penyelesai yang mengembalikan angka tanpa memberi tahu apakah angka itu berarti adalah kegagalan yang justru ingin ditunjukkan proyek ini.',
    ],
    stationsTitle: 'Stasiun',
    stationsLead:
      'Setiap rekaman membawa sumber, lisensi, periode, dan datumnya. Tidak ada yang diasumsikan merujuk MSL.',
    plainEyebrow: 'Cara kerja',
    characterEyebrow: 'Watak pasang surut',
    stationsEyebrow: 'Rekaman',
    gateEyebrow: 'Lisensi',
    gateTitle: 'Sumber yang belum dibuka',
    gateLead:
      'Adapter untuk sumber ini sudah ditulis dan diuji, tetapi gerbang lisensi menutupnya sampai syarat penggunaannya diverifikasi. Tidak ada datanya di situs ini.',
    openStation: 'Buka rekaman',
    readMethod: 'Bagaimana ini dihitung',
    heroChartNote: 'Dihitung saat situs ini dibangun, dari rekaman stasiun',
    heroChartWindow: 'hari terakhir dari bagian yang dicocokkan',
    statStations: 'Stasiun',
    statDays: 'Hari rekaman',
    statSamples: 'Bacaan jam-jaman',
    computedClaim:
      'Tidak ada satu pun tabel konstanta harmonik yang dikirim sebagai data. Setiap amplitudo dan fase di situs ini keluar dari pencocokan atas rekaman yang ditampilkan bersamanya.',
    toolsEyebrow: 'Yang bisa dilakukan',
    toolsTitle: 'Lima cara memeriksa satu rekaman',
    tools: {
      catatan: 'Rekaman, hasil pencocokan di atasnya, dan sisa yang tak terjelaskan.',
      komponen: 'Amplitudo dan fase tiap gelombang penyusun, beserta koreksi nodalnya.',
      resolusi: 'Perpendek jendelanya dan lihat komponen mana yang berhenti bisa dipisahkan.',
      banding: 'Kuadrat terkecil berhadapan dengan metode Admiralty pada rekaman yang sama.',
      prediksi: 'Konstanta hasil pencocokan diteruskan ke depan, lengkap dengan pasang dan surutnya.',
    },
    characterTitle: 'Empat pelabuhan, empat watak, satu fisika',
    characterLead:
      'Bilangan Formzahl F = (K1 + O1) / (M2 + S2) menggolongkan watak pasang surut. Nusantara memuat keempat golongannya: Sabang dua kali sehari nyaris seimbang, Pelabuhan Jakarta sekali sehari, sisanya di antara keduanya. Setiap angka di bawah ini keluar dari pencocokan kuadrat terkecil atas rekaman stasiun itu sendiri — tidak ada yang dikutip dari tabel.',
  },
  catatan: {
    title: 'Catatan',
    lead:
      'Rekaman pengamatan, prediksi hasil pencocokan yang ditumpangkan di atasnya, dan residu di pita bawah pada sumbu waktu yang sama. Residu memuat cuaca, surge, dan segala yang tidak dijelaskan model harmonik.',
    fitWindow: 'Jendela pencocokan',
    validationWindow: 'Jendela validasi',
    heldOut: 'Bagian ini tidak dilihat saat mencocokkan',
    splitLabel: 'Porsi rekaman yang dicocokkan',
    splitHint:
      'Sisanya ditahan dan diprediksi. Perpendek jendelanya dan komponen mulai berguguran — kriteria Rayleigh yang sama, digerakkan oleh jendela alih-alih oleh panjang rekaman.',
    fitRms: 'Sisa yang tak terjelaskan — bagian yang dicocokkan',
    heldOutRms: 'Sisa yang tak terjelaskan — bagian yang ditahan',
    eyebrow: 'Grafik',
    keyObserved: 'tinggi air yang benar-benar terekam alat',
    keyPredicted: 'hasil hitungan dari komponen pasang surut',
    keyResidual: 'selisih keduanya — cuaca, angin, dan gangguan alat',
    fitRmsNote: 'Rata-rata jarak antara garis hitam dan garis biru pada bagian yang dipakai menghitung.',
    heldOutRmsNote: 'Pada bagian yang sengaja tidak dilihat saat menghitung. Inilah ujian yang sebenarnya.',
    readingTitle: 'Cara membaca grafik ini',
    readingBody:
      'Bila garis biru menempel pada garis hitam, komponen pasang surut sudah menjelaskan hampir semua gerakan air. Bagian yang diarsir di sebelah kanan tidak pernah dilihat saat menghitung — di sana garis biru murni ramalan. Pita ochre di bawah adalah selisihnya; ia tidak pernah disembunyikan atau dihaluskan.',
    fallbackNote:
      'Yang ditampilkan di bawah adalah himpunan terbesar yang masih didukung jendela ini:',
  },
  komponen: {
    eyebrow: 'Komponen',
    tableCaption:
      'H adalah setengah tinggi gelombang komponen itu; g adalah keterlambatannya terhadap posisi Bulan atau Matahari. f dan u adalah koreksi 18,6 tahunan yang sudah diterapkan dan tetap ditampilkan.',
    asymmetryTitle: 'Naik dan turun tidak sama cepat',
    asymmetryLead:
      'Di perairan dangkal, gesekan dasar laut memindahkan sebagian energi M2 ke kelipatan frekuensinya, terutama M4. Akibatnya satu sisi gelombang menjadi curam dan sisi lainnya melandai: air naik lebih cepat daripada turunnya, atau sebaliknya.',
    asymmetryEyebrow: 'Perairan dangkal',
    asymmetryShallow: 'Dari M2 dan M4 saja',
    asymmetryActual: 'Pasang surut sebenarnya',
    asymmetryDisagree:
      'Kedua ukuran ini menunjuk arah berbeda, dan itu wajar di sini: yang menentukan lama naik-turun bukan distorsi perairan dangkal, melainkan komponen harian K1 dan O1.',
    asymmetryRatio: 'Rasio M4/M2',
    asymmetryPhase: 'Fase relatif 2g(M2) − g(M4)',
    rise: 'Lama naik',
    fall: 'Lama turun',
    title: 'Komponen harmonik',
    lead:
      'Amplitudo, fase, dan frekuensi tiap komponen. Yang tidak dapat dipisahkan oleh rekaman ditandai, bukan dilaporkan.',
    explorerTitle: 'Penjelajah komponen',
    explorerLead:
      'Mulailah dengan M2 sendirian — gelombang dua kali sehari yang bersih. Tambahkan S2 dan irama purnama-perbani muncul dari pelayangan dua kosinus itu.',
    formzahlTitle: 'Bilangan Formzahl dan tipe pasang surut',
    publishedTitle: 'Nilai terbit untuk perbandingan',
  },
  resolusi: {
    title: 'Resolusi',
    lead:
      'Dua komponen hanya dapat dipisahkan bila rekaman cukup panjang untuk membuat keduanya bergeser satu siklus penuh. Perpendek jendelanya dan lihat komponen berguguran serta bilangan kondisi naik.',
    sliderLabel: 'Panjang jendela (hari)',
    keptTitle: 'Masih dapat dipisahkan',
    droppedTitle: 'Tidak dapat dipisahkan pada jendela ini',
    conditionTitle: 'Bilangan kondisi',
  },
  banding: {
    title: 'Banding metode',
    lead:
      'Rekaman yang sama, dua metode klasik. Kuadrat terkecil menyelesaikan semua komponen bersama-sama; Admiralty memproyeksikan satu per satu dan menyimpulkan sisanya dari rasio baku.',
    difference: 'Selisih',
  },
  prediksi: {
    title: 'Prediksi',
    lead:
      'Konstanta hasil pencocokan diteruskan ke depan. Koreksi nodal dihitung ulang pada waktu prediksi, bukan dibawa dari jendela pencocokan.',
    extremaTitle: 'Pasang dan surut',
  },
  metode: {
    title: 'Metode',
    lead:
      'Apa yang dihitung, dari rekaman mana, dengan cara apa, dan seberapa besar sisanya yang tidak dijelaskan.',
  },
}

const en: Dictionary = {
  siteName: 'Tide Analysis',
  tagline: 'Tidal harmonic analysis from real observations',
  nav: {
    beranda: 'Home',
    catatan: 'Record',
    komponen: 'Constituents',
    resolusi: 'Resolution',
    banding: 'Comparison',
    prediksi: 'Prediction',
    metode: 'Method',
  },
  warning: {
    title: 'Not for navigation',
    body:
      'This is an educational tool. Its numbers are computed from raw records that have had no quality control, and must not be used for navigation or safety.',
    official: 'The official Indonesian tide tables are published by Pushidrosal.',
  },
  common: {
    station: 'Station',
    source: 'Source',
    licence: 'Licence',
    datum: 'Datum',
    period: 'Period',
    days: 'days',
    samples: 'samples',
    gaps: 'gaps',
    amplitude: 'Amplitude H (m)',
    phase: 'Phase g (°)',
    speed: 'Speed (°/h)',
    period_h: 'Period (h)',
    constituent: 'Constituent',
    conditionNumber: 'Condition number κ',
    residualRms: 'Residual RMS',
    meanLevel: 'Mean level Z₀',
    unresolved: 'Unresolved',
    resolved: 'Resolved',
    observed: 'Observed',
    predicted: 'Predicted',
    residual: 'Residual',
    nodalF: 'Nodal factor f',
    nodalU: 'Nodal correction u (°)',
    method: 'Method',
    leastSquares: 'Least squares',
    admiralty: 'Admiralty',
    loading: 'Computing…',
    refusal: 'Request refused',
    recordLength: 'Record length',
    requiredLength: 'Length required',
    high: 'High water',
    low: 'Low water',
    time: 'Time',
    height: 'Height',
    determination: 'Determination',
    direct: 'Direct',
    inferred: 'Inferred',
    uncertainty: '1σ uncertainty',
    provenance: 'Source, licence and datum notes',
  },
  conditioning: {
    baik: 'good',
    wajar: 'fair',
    marginal: 'marginal',
    buruk: 'poor — the numbers below cannot be trusted',
  },
  home: {
    heroTitle: 'Tides, computed from the sea itself',
    heroLead:
      'Watch the tide at Indonesian ports taken apart into the waves it is made of, then predicted forward. Every number is computed here rather than copied from a table.',
    plainTitle: 'How it works, in three steps',
    plainSteps: [
      {
        title: 'The sea is recorded',
        body: 'A gauge in a harbour writes down the water level every hour for seven months. That is the black line on the chart: as it came, weather and instrument trouble included.',
      },
      {
        title: 'The record is taken apart',
        body: 'A tide is a sum of steady waves driven by the Moon and the Sun. We work out how large each one is at that place, and how late it arrives.',
      },
      {
        title: 'What is left over is shown',
        body: 'Whatever those waves cannot explain — weather, wind, surge — is not hidden. It is drawn as its own band beneath the chart.',
      },
    ],
    lead:
      'Tide height is a sum of cosines. The frequencies are astronomical and universal — M2 has the same 12.42-hour period in Balikpapan as in Bristol. Only amplitude and phase are local, and both come from fitting a record of observations rather than copying a table.',
    whyTitle: 'Why analysis, not lookup',
    why: [
      'Constants here are always computed from a record. No harmonic constant table ships as data.',
      'The Rayleigh criterion is enforced before the solve. If the record is too short to separate a pair of constituents, the request is refused, naming the pair and the record length required.',
      'Every solve reports its condition number. A solver that returns numbers without indicating whether they mean anything is the failure this project exists to expose.',
    ],
    stationsTitle: 'Stations',
    stationsLead:
      'Every record carries its source, licence, period and datum. Nothing is assumed to be referenced to MSL.',
    plainEyebrow: 'How it works',
    characterEyebrow: 'Tidal character',
    stationsEyebrow: 'Records',
    gateEyebrow: 'Licensing',
    gateTitle: 'Sources still behind the gate',
    gateLead:
      'The adapters for these are written and tested, but the licence gate keeps them shut until their terms are verified. None of their data is on this site.',
    openStation: 'Open the record for',
    readMethod: 'How this is computed',
    heroChartNote: 'Computed when this site was built, from the record at',
    heroChartWindow: 'days from the end of the fitted part',
    statStations: 'Stations',
    statDays: 'Days of record',
    statSamples: 'Hourly readings',
    computedClaim:
      'No harmonic constant table ships as data. Every amplitude and phase on this site came out of a fit to the record displayed beside it.',
    toolsEyebrow: 'What you can do',
    toolsTitle: 'Five ways to interrogate one record',
    tools: {
      catatan: 'The record, the fit laid over it, and what the fit could not explain.',
      komponen: 'Amplitude and phase per constituent wave, with the nodal corrections applied.',
      resolusi: 'Shorten the window and watch which constituents stop being separable.',
      banding: 'Least squares against the Admiralty method on the same record.',
      prediksi: 'The fitted constants carried forward, with the high and low waters they imply.',
    },
    characterTitle: 'Four ports, four characters, one physics',
    characterLead:
      'The Formzahl number F = (K1 + O1) / (M2 + S2) classifies tidal character, and the archipelago holds all four classes: Sabang has two nearly equal tides a day, Jakarta Port has one, and the rest sit between them. Every number below came out of a least-squares fit to that station\'s own record — none of it is quoted from a table.',
  },
  catatan: {
    title: 'The record',
    lead:
      'The observed record, the fitted prediction overlaid on it, and the residual in its own band on the same time axis. The residual holds weather, surge, and everything the harmonic model does not explain.',
    fitWindow: 'Fit window',
    validationWindow: 'Validation window',
    heldOut: 'This part was not seen during fitting',
    splitLabel: 'Share of the record fitted',
    splitHint:
      'The rest is held out and predicted. Shorten the window and constituents start dropping out — the same Rayleigh criterion, moved by the window rather than by the length of the record.',
    fitRms: 'Unexplained, over the fitted part',
    heldOutRms: 'Unexplained, over the held-out part',
    eyebrow: 'The chart',
    keyObserved: 'the water level the gauge actually recorded',
    keyPredicted: 'what the fitted constituents say it should be',
    keyResidual: 'the difference — weather, wind and instrument trouble',
    fitRmsNote: 'Mean distance between the black line and the blue one, over the part used to fit.',
    heldOutRmsNote: 'Over the part deliberately not seen while fitting. This is the real test.',
    readingTitle: 'How to read this chart',
    readingBody:
      'Where the blue line sits on the black one, the constituents have explained almost all of the water’s movement. The shaded part on the right was never seen while fitting — there the blue line is pure prediction. The ochre band beneath is the difference, and it is never hidden or smoothed.',
    fallbackNote: 'What follows is the largest set this window can still support:',
  },
  komponen: {
    eyebrow: 'Constituents',
    tableCaption:
      'H is half the height of that constituent’s wave; g is how late it arrives behind the Moon or Sun. f and u are the 18.6-year corrections, applied and still shown.',
    asymmetryTitle: 'The rise and the fall are not the same length',
    asymmetryLead:
      'In shallow water, friction on the sea bed moves some of M2’s energy into multiples of its frequency, M4 above all. One half of the wave steepens and the other flattens: the water rises faster than it falls, or the reverse.',
    asymmetryEyebrow: 'Shallow water',
    asymmetryShallow: 'From M2 and M4 alone',
    asymmetryActual: 'The tide as it runs',
    asymmetryDisagree:
      'These two point in different directions, and here that is expected: what sets the rise and fall times is not shallow-water distortion but the diurnal constituents K1 and O1.',
    asymmetryRatio: 'M4/M2 ratio',
    asymmetryPhase: 'Relative phase 2g(M2) − g(M4)',
    rise: 'Time to rise',
    fall: 'Time to fall',
    title: 'Harmonic constituents',
    lead:
      'Amplitude, phase and frequency per constituent. The ones the record cannot honestly resolve are marked, not reported.',
    explorerTitle: 'Constituent explorer',
    explorerLead:
      'Start with M2 alone — a clean twice-daily wave. Add S2 and the spring-neap rhythm emerges from the beat between two cosines.',
    formzahlTitle: 'Formzahl number and tide type',
    publishedTitle: 'Published values, for comparison',
  },
  resolusi: {
    title: 'Resolution',
    lead:
      'Two constituents can only be separated if the record is long enough for them to drift a full cycle apart. Shorten the window and watch constituents drop out and the condition number rise.',
    sliderLabel: 'Window length (days)',
    keptTitle: 'Still separable',
    droppedTitle: 'Not separable on this window',
    conditionTitle: 'Condition number',
  },
  banding: {
    title: 'Method comparison',
    lead:
      'The same record, two classical methods. Least squares solves every constituent jointly; Admiralty projects them one at a time and infers the rest from fixed ratios.',
    difference: 'Difference',
  },
  prediksi: {
    title: 'Prediction',
    lead:
      'The fitted constants carried forward. Nodal corrections are recomputed at the prediction time rather than carried from the fit window.',
    extremaTitle: 'High and low waters',
  },
  metode: {
    title: 'Method',
    lead:
      'What is computed, from which record, by what means, and how much is left unexplained.',
  },
}

const DICTIONARIES: Record<Locale, Dictionary> = { id, en }

export function dictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}
