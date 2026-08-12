/**
 * Licence declarations and the gate that enforces them.
 *
 * Invariant 12: the gate runs before any adapter. A source whose terms are not
 * verified ships disabled, and the build refuses a record that claims it. Two
 * sibling projects hit licensing walls late; this one hits them at build time.
 */

import type { SourceId } from '@/lib/tide/record'

export type LicenceStatus =
  /** Terms read, recorded here, and compatible with redistribution. */
  | 'resolved'
  /** Terms not yet verified. The adapter exists; the gate keeps it shut. */
  | 'unverified'

export interface SourceDeclaration {
  readonly id: SourceId
  readonly name: string
  readonly homepage: string
  readonly termsUrl: string
  readonly status: LicenceStatus
  /** Whether records from this source may be bundled and served. */
  readonly enabled: boolean
  /** Licence or terms identifier, as the source itself states it. */
  readonly licence: string
  /** Citation the source asks for, reproduced verbatim where it gives one. */
  readonly attribution: string
  /** ISO date the terms were last read. */
  readonly verifiedOn: string
  /** Why the source is in this state, in one sentence. */
  readonly note: string
}

export interface RecordDeclaration {
  readonly stationId: string
  readonly stationName: string
  readonly source: SourceId
  readonly file: string
  readonly startSec: number
  readonly endSec: number
  readonly sampleCount: number
  readonly intervalSec: number
  readonly datumCode: string
  readonly gapCount: number
  readonly fetchedOn: string
}

export interface RecordManifest {
  readonly sources: readonly SourceDeclaration[]
  readonly records: readonly RecordDeclaration[]
}

export class LicenceGateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LicenceGateError'
  }
}

export function findSource(
  manifest: RecordManifest,
  id: SourceId,
): SourceDeclaration | undefined {
  return manifest.sources.find((s) => s.id === id)
}

/**
 * Throws unless the source is declared, resolved and enabled. Every adapter
 * calls this before it touches a record — including at build time.
 */
export function assertSourceUsable(manifest: RecordManifest, id: SourceId): SourceDeclaration {
  const source = findSource(manifest, id)
  if (source === undefined) {
    throw new LicenceGateError(`Source '${id}' is not declared in the manifest.`)
  }
  if (source.status !== 'resolved') {
    throw new LicenceGateError(
      `Source '${id}' has status '${source.status}': ${source.note} See ${source.termsUrl}.`,
    )
  }
  if (!source.enabled) {
    throw new LicenceGateError(`Source '${id}' is declared but disabled: ${source.note}`)
  }
  return source
}

/** Every problem with the manifest at once, so the build reports all of them. */
export function validateManifest(manifest: RecordManifest): string[] {
  const problems: string[] = []
  const declared = new Set(manifest.sources.map((s) => s.id))

  for (const source of manifest.sources) {
    if (source.status === 'resolved' && source.licence.trim() === '') {
      problems.push(`Source '${source.id}' is resolved but names no licence.`)
    }
    if (source.enabled && source.status !== 'resolved') {
      problems.push(
        `Source '${source.id}' is enabled with status '${source.status}' — the gate forbids this.`,
      )
    }
    if (source.status === 'resolved' && source.attribution.trim() === '') {
      problems.push(`Source '${source.id}' is resolved but records no attribution.`)
    }
  }

  for (const record of manifest.records) {
    if (!declared.has(record.source)) {
      problems.push(`Record '${record.stationId}' claims undeclared source '${record.source}'.`)
      continue
    }
    const source = findSource(manifest, record.source) as SourceDeclaration
    if (source.status !== 'resolved' || !source.enabled) {
      problems.push(
        `Record '${record.stationId}' comes from '${source.id}', which is ${source.status} and ${source.enabled ? 'enabled' : 'disabled'}.`,
      )
    }
    if (record.datumCode.trim() === '') {
      problems.push(`Record '${record.stationId}' has no datum.`)
    }
    if (record.endSec <= record.startSec) {
      problems.push(`Record '${record.stationId}' has no period.`)
    }
    if (record.sampleCount <= 0) {
      problems.push(`Record '${record.stationId}' has no samples.`)
    }
  }

  return problems
}
