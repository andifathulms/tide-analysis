import { describe, expect, it } from 'vitest'
import { readIntParam, withIntParam } from '@/lib/view/queryState'

describe('reading a query parameter', () => {
  it('reads a present integer', () => {
    expect(readIntParam('?days=15', 'days')).toBe(15)
  })

  it('returns null when the key is absent', () => {
    expect(readIntParam('?percent=40', 'days')).toBeNull()
    expect(readIntParam('', 'days')).toBeNull()
  })

  it('returns null for a non-numeric value rather than NaN', () => {
    expect(readIntParam('?days=benoa', 'days')).toBeNull()
  })

  it('ignores unrelated keys sharing the query string', () => {
    expect(readIntParam('?station=benoa&days=200', 'days')).toBe(200)
  })
})

describe('writing a query parameter', () => {
  it('adds a key to an empty query string', () => {
    expect(withIntParam('', 'days', 15)).toBe('?days=15')
  })

  it('rounds to an integer', () => {
    expect(withIntParam('', 'percent', 66.7)).toBe('?percent=67')
  })

  it('replaces an existing value for the same key', () => {
    expect(withIntParam('?days=15', 'days', 200)).toBe('?days=200')
  })

  it('preserves other keys untouched', () => {
    expect(withIntParam('?station=benoa&days=15', 'days', 30)).toBe('?station=benoa&days=30')
  })

  it('removes the key when the value is null, leaving other keys', () => {
    expect(withIntParam('?station=benoa&days=15', 'days', null)).toBe('?station=benoa')
  })

  it('returns the empty string when nothing is left to encode', () => {
    expect(withIntParam('?days=15', 'days', null)).toBe('')
  })

  it('round-trips through readIntParam', () => {
    const written = withIntParam('', 'days', 42)
    expect(readIntParam(written, 'days')).toBe(42)
  })
})
