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
  }
  readonly conditioning: Record<'baik' | 'wajar' | 'marginal' | 'buruk', string>
  readonly home: {
    readonly lead: string
    readonly whyTitle: string
    readonly why: readonly string[]
    readonly stationsTitle: string
    readonly stationsLead: string
    readonly characterTitle: string
    readonly characterLead: string
  }
  readonly catatan: {
    readonly title: string
    readonly lead: string
    readonly fitWindow: string
    readonly validationWindow: string
    readonly heldOut: string
  }
  readonly komponen: {
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
  siteName: 'Pasut',
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
  },
  conditioning: {
    baik: 'baik',
    wajar: 'wajar',
    marginal: 'marginal',
    buruk: 'buruk — angka di bawah ini tidak dapat dipercaya',
  },
  home: {
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
  },
  komponen: {
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
  siteName: 'Pasut',
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
  },
  conditioning: {
    baik: 'good',
    wajar: 'fair',
    marginal: 'marginal',
    buruk: 'poor — the numbers below cannot be trusted',
  },
  home: {
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
  },
  komponen: {
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
