/**
 * Display formatting. Local time is a display concern only — the fit never
 * sees a timezone (invariant 8), so every conversion happens here, at the edge.
 */

const MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

export interface TimeZoneDisplay {
  readonly offsetHours: number
  readonly label: string
}

export const UTC_DISPLAY: TimeZoneDisplay = { offsetHours: 0, label: 'UTC' }

export function zoneOf(record: {
  utcOffsetHours?: number
  timeZoneLabel?: string
}): TimeZoneDisplay {
  if (record.utcOffsetHours === undefined || record.timeZoneLabel === undefined) {
    return UTC_DISPLAY
  }
  return { offsetHours: record.utcOffsetHours, label: record.timeZoneLabel }
}

function parts(timeSec: number, zone: TimeZoneDisplay) {
  const shifted = new Date((timeSec + zone.offsetHours * 3600) * 1000)
  return {
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth(),
    year: shifted.getUTCFullYear(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  }
}

export function formatDate(timeSec: number, zone: TimeZoneDisplay = UTC_DISPLAY): string {
  const p = parts(timeSec, zone)
  return `${String(p.day).padStart(2, '0')} ${MONTHS_ID[p.month]} ${p.year}`
}

export function formatDateTime(timeSec: number, zone: TimeZoneDisplay = UTC_DISPLAY): string {
  const p = parts(timeSec, zone)
  return `${String(p.day).padStart(2, '0')} ${MONTHS_ID[p.month]} ${p.year} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')} ${zone.label}`
}

export function formatClock(timeSec: number, zone: TimeZoneDisplay = UTC_DISPLAY): string {
  const p = parts(timeSec, zone)
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

export function formatDays(days: number): string {
  return days >= 100 ? days.toFixed(0) : days.toFixed(1)
}
