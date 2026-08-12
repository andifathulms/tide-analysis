/**
 * The gate that stands in front of the build.
 *
 * Every bundled record must come from a source whose licence is resolved and
 * enabled, must carry a datum, must declare its gaps, and must record its
 * period. `pnpm build` runs this first and refuses to proceed if it fails.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { validateManifest, type RecordManifest } from '../lib/sources/manifest'
import type { SerialisedRecord } from '../lib/tide/record'

const RECORDS_DIR = join(process.cwd(), 'data', 'records')
const MANIFEST_PATH = join(RECORDS_DIR, 'manifest.json')

function readManifest(): RecordManifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as RecordManifest
}

function readRecordFiles(): string[] {
  return readdirSync(RECORDS_DIR).filter((f) => f.endsWith('.json') && f !== 'manifest.json')
}

function main(): void {
  const problems: string[] = []
  const manifest = readManifest()
  problems.push(...validateManifest(manifest))

  const declaredFiles = new Set(manifest.records.map((r) => r.file))
  for (const file of readRecordFiles()) {
    if (!declaredFiles.has(file)) {
      problems.push(`${file} is bundled but not declared in the manifest.`)
    }
  }

  for (const declaration of manifest.records) {
    const path = join(RECORDS_DIR, declaration.file)
    let record: SerialisedRecord
    try {
      record = JSON.parse(readFileSync(path, 'utf8')) as SerialisedRecord
    } catch {
      problems.push(`${declaration.file} is declared but missing or unreadable.`)
      continue
    }

    const where = declaration.stationId
    if (record.stationId !== declaration.stationId) {
      problems.push(`${where}: file declares station '${record.stationId}'.`)
    }
    if (record.source !== declaration.source) {
      problems.push(`${where}: file declares source '${record.source}'.`)
    }
    if (record.datum === undefined || record.datum.code.trim() === '') {
      problems.push(`${where}: no datum on the record. Never assume MSL.`)
    }
    if (record.licence.trim() === '' || record.attribution.trim() === '') {
      problems.push(`${where}: record carries no licence or attribution.`)
    }
    if (record.sampleIndices.length !== record.heightsM.length) {
      problems.push(`${where}: sample indices and heights differ in length.`)
    }
    if (record.sampleIndices.length !== declaration.sampleCount) {
      problems.push(
        `${where}: manifest says ${declaration.sampleCount} samples, file has ${record.sampleIndices.length}.`,
      )
    }
    if (record.gaps === undefined) {
      problems.push(`${where}: gaps must be declared, even when there are none.`)
    } else if (record.gaps.length !== declaration.gapCount) {
      problems.push(
        `${where}: manifest says ${declaration.gapCount} gaps, file declares ${record.gaps.length}.`,
      )
    }

    let previous = -1
    for (const index of record.sampleIndices) {
      if (!Number.isInteger(index) || index <= previous) {
        problems.push(`${where}: sample indices are not strictly increasing integers.`)
        break
      }
      previous = index
    }

    const endSec = record.startSec + previous * record.intervalSec
    if (endSec !== declaration.endSec || record.startSec !== declaration.startSec) {
      problems.push(`${where}: the period in the manifest does not match the file.`)
    }
    const days = (endSec - record.startSec) / 86400
    if (days <= 0) {
      problems.push(`${where}: record has no period.`)
    }
  }

  if (problems.length > 0) {
    console.error('\nRecord validation failed:\n')
    for (const problem of problems) console.error(`  ✗ ${problem}`)
    console.error('')
    process.exit(1)
  }

  const enabled = manifest.sources.filter((s) => s.enabled).map((s) => s.id)
  const blocked = manifest.sources.filter((s) => !s.enabled)
  console.log(`Records validated: ${manifest.records.length} from sources [${enabled.join(', ')}]`)
  for (const source of blocked) {
    console.log(`  gate closed: ${source.id} — ${source.status}. ${source.note}`)
  }
  for (const record of manifest.records) {
    const days = ((record.endSec - record.startSec) / 86400).toFixed(1)
    console.log(
      `  ${record.stationId.padEnd(16)} ${days.padStart(6)} hari  ${String(record.sampleCount).padStart(6)} sampel  ${record.gapCount} jeda  datum ${record.datumCode}`,
    )
  }
}

main()
