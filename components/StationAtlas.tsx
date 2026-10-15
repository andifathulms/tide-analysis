import Link from 'next/link'
import type { AtlasModel } from '@/lib/chart/atlas'
import { COASTLINE_PATH } from '@/lib/chart/coastline'
import type { Dictionary, Locale } from '@/lib/i18n/dictionary'
import type { TideType } from '@/lib/tide/formzahl'
import { formzahlRank } from '@/lib/view/stages'
import { FormzahlSwatch, Scroller } from '@/components/ui'

/** Literal class names, so Tailwind can see them. */
const FZ_FILL = { 1: 'fill-fz1', 2: 'fill-fz2', 3: 'fill-fz3', 4: 'fill-fz4' } as const

const LEGEND: readonly TideType[] = [
  'harian-ganda',
  'campuran-condong-ganda',
  'campuran-condong-tunggal',
  'harian-tunggal',
]

/**
 * The eight gauges where they stand, coloured by what the tide does there.
 * Read west to east and the archipelago walks from two tides a day to one —
 * the same progression the Formzahl comparison below makes in numbers.
 *
 * Every mark links to its station. Colour is never the only carrier: each
 * mark is named, carries F, and the legend prints the classes in words.
 */
export function StationAtlas({
  model,
  dict,
  locale,
}: {
  model: AtlasModel
  dict: Dictionary
  locale: Locale
}) {
  return (
    <figure className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-inkMuted">
        {LEGEND.map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <FormzahlSwatch type={type} className="h-2.5 w-5 rounded-sm" />
            {dict.tideType[type].label}
          </span>
        ))}
      </div>

      <Scroller labelledBy="atlas-caption">
        <div className="min-w-[40rem] overflow-hidden rounded-card border border-rule bg-surface">
          <svg
            viewBox={`0 0 ${model.width} ${model.height}`}
            className="block h-auto w-full"
            role="img"
            aria-labelledby="atlas-caption"
          >
            <path d={COASTLINE_PATH} className="fill-rule" />

            <g className="stroke-grid" strokeWidth={0.6} strokeDasharray="2 4">
              {model.meridians.map((m) => (
                <line key={m.label} x1={m.x} x2={m.x} y1={0} y2={model.height} />
              ))}
              {model.parallels.map((p) => (
                <line key={p.label} x1={0} x2={model.width} y1={p.y} y2={p.y} />
              ))}
            </g>
            <g className="numeric fill-inkFaint text-chartLabel">
              {model.meridians.map((m) => (
                <text key={m.label} x={m.x + 3} y={model.height - 6}>
                  {m.label}
                </text>
              ))}
              {model.parallels.map((p) => (
                <text key={p.label} x={6} y={p.y - 4}>
                  {p.label}
                </text>
              ))}
            </g>

            {/* Seas in italic, the way a nautical chart letters water. */}
            <g className="accent-serif fill-inkFaint" fontSize={15} letterSpacing="0.08em">
              {model.seas.map((sea) => (
                <text key={sea.name} x={sea.x} y={sea.y} textAnchor="middle">
                  {sea.name}
                </text>
              ))}
            </g>

            {model.stations.map((station) => {
              const fill = FZ_FILL[formzahlRank(station.type)]
              const tx = station.x + station.label.dx
              const ty = station.y + station.label.dy
              return (
                <Link key={station.stationId} href={`/${locale}/catatan/${station.stationId}`} className="group">
                  <title>{`${station.name} · F ${station.formzahl.toFixed(3)} · ${dict.tideType[station.type].label}`}</title>
                  <circle cx={station.x} cy={station.y} r={station.r + 5} className={fill} opacity={0.25} />
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={station.r}
                    className={`${fill} stroke-surface group-hover:stroke-ink`}
                    strokeWidth={2}
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor={station.label.anchor}
                    className="fill-ink stroke-surface text-[12.5px] font-bold group-hover:underline"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {station.name}
                  </text>
                  <text
                    x={tx}
                    y={ty + 13}
                    textAnchor={station.label.anchor}
                    className="numeric fill-inkMuted stroke-surface text-[10.5px]"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    F {station.formzahl.toFixed(3)}
                  </text>
                </Link>
              )
            })}
          </svg>
        </div>
      </Scroller>

      <figcaption id="atlas-caption" className="max-w-reading text-caption text-inkFaint">
        {dict.home.atlasNote}
      </figcaption>
    </figure>
  )
}
