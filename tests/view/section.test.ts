import { describe, expect, it } from 'vitest'
import { sectionOf } from '@/lib/view/section'

describe('masthead section', () => {
  it('names a station view as Stasiun, the bare resolution page as Pelajari', () => {
    expect(sectionOf('/id/catatan/ioc-benoa')).toBe('stasiun')
    expect(sectionOf('/en/banding/ioc-ambon/')).toBe('stasiun')
    expect(sectionOf('/id/resolusi/ioc-benoa')).toBe('stasiun')
    expect(sectionOf('/id/resolusi')).toBe('pelajari')
    expect(sectionOf('/id/metode')).toBe('metode')
  })

  it('marks nothing on the home page, and strips the Pages basePath', () => {
    expect(sectionOf('/id')).toBeNull()
    expect(sectionOf('/tide-analysis/id/metode', '/tide-analysis')).toBe('metode')
  })
})
