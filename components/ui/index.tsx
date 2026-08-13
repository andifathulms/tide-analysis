import type { ReactNode } from 'react'

/**
 * The small set of pieces every page is built from.
 *
 * They exist so the design decisions live in one file rather than being
 * re-decided per page, and so a page reads as a description of its content
 * rather than a pile of utility classes.
 */

export function Section({
  eyebrow,
  title,
  lead,
  children,
  id,
}: {
  eyebrow?: string
  title?: string
  lead?: ReactNode
  children?: ReactNode
  id?: string
}) {
  return (
    <section id={id} className="space-y-4">
      {(eyebrow !== undefined || title !== undefined) && (
        <header className="space-y-1.5">
          {eyebrow !== undefined && <p className="eyebrow">{eyebrow}</p>}
          {title !== undefined && <h2 className="text-headline">{title}</h2>}
          {lead !== undefined && (
            <div className="max-w-reading text-body text-inkMuted">{lead}</div>
          )}
        </header>
      )}
      {children}
    </section>
  )
}

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'li'
}) {
  return <Tag className={`card p-card ${className}`}>{children}</Tag>
}

/**
 * A single number with its name and, where one helps, a plain-language note.
 * The number is the loud thing; the label is quiet above it.
 */
export function Stat({
  label,
  value,
  unit,
  note,
  tone = 'ink',
  size = 'default',
}: {
  label: string
  value: ReactNode
  unit?: string
  note?: ReactNode
  tone?: 'ink' | 'prediction' | 'residual' | 'unresolved'
  size?: 'default' | 'large'
}) {
  const toneClass = {
    ink: 'text-ink',
    prediction: 'text-prediction',
    residual: 'text-residualText',
    unresolved: 'text-unresolved',
  }[tone]

  return (
    <div className="space-y-1">
      <p className="eyebrow">{label}</p>
      <p
        className={`numeric ${toneClass} ${size === 'large' ? 'text-display' : 'text-title'} leading-none`}
      >
        {value}
        {unit !== undefined && (
          <span className="ml-1 text-caption font-normal text-inkFaint">{unit}</span>
        )}
      </p>
      {note !== undefined && <p className="text-caption text-inkFaint">{note}</p>}
    </div>
  )
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="card grid gap-block p-card sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  )
}

export type CalloutTone = 'note' | 'warning' | 'refusal'

/**
 * A block that says something the reader must not miss. Tone carries meaning:
 * refusal is the project's central honesty mechanism and wears the reserved
 * red, never decoration.
 */
export function Callout({
  tone = 'note',
  title,
  children,
}: {
  tone?: CalloutTone
  title?: string
  children: ReactNode
}) {
  const styles = {
    note: {
      wrap: 'border-l-4 border-prediction bg-predictionSoft/60',
      heading: 'text-prediction',
    },
    warning: {
      wrap: 'border-l-4 border-residual bg-residualSoft/60',
      heading: 'text-residualText',
    },
    refusal: {
      wrap: 'border-l-4 border-unresolved bg-unresolvedSoft/60',
      heading: 'text-unresolved',
    },
  }[tone]

  return (
    <aside className={`rounded-r-card px-card py-4 ${styles.wrap}`}>
      {title !== undefined && (
        <p className={`eyebrow ${styles.heading}`}>{title}</p>
      )}
      <div className="mt-1.5 space-y-2 text-body">{children}</div>
    </aside>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'prediction' | 'residual' | 'unresolved'
}) {
  const toneClass = {
    neutral: 'border-rule bg-sunken text-inkMuted',
    prediction: 'border-prediction/30 bg-predictionSoft text-prediction',
    residual: 'border-residual/30 bg-residualSoft text-residualText',
    unresolved: 'border-unresolved/30 bg-unresolvedSoft text-unresolved',
  }[tone]

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-micro font-medium ${toneClass}`}
    >
      {children}
    </span>
  )
}

/**
 * A technical term with its plain meaning attached.
 *
 * The vocabulary is the point of the project, so the words stay — but a reader
 * meeting "Formzahl" or "κ" for the first time should not have to leave to
 * find out what it means.
 */
export function Term({ children, meaning }: { children: ReactNode; meaning: string }) {
  return (
    <span className="term" title={meaning}>
      {children}
    </span>
  )
}

/** A caption under a figure or table: what the reader is looking at. */
export function Caption({ children }: { children: ReactNode }) {
  return <p className="mt-3 max-w-reading text-caption text-inkFaint">{children}</p>
}

/** A key showing what each line on the chart is, in plain words. */
export function TraceKey({
  items,
}: {
  items: ReadonlyArray<{ colour: 'ink' | 'prediction' | 'residual'; label: string; meaning: string }>
}) {
  const bar = { ink: 'bg-ink', prediction: 'bg-prediction', residual: 'bg-residual' }
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-baseline gap-2 text-caption">
          <span className={`mt-1.5 inline-block h-[3px] w-7 shrink-0 rounded-full ${bar[item.colour]}`} />
          <span>
            <span className="font-medium text-ink">{item.label}</span>{' '}
            <span className="text-inkFaint">{item.meaning}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Wide content — tables, charts — scrolls inside its own box, never the page. */
export function Scroller({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-gutter overflow-x-auto px-gutter sm:mx-0 sm:px-0">{children}</div>
  )
}
