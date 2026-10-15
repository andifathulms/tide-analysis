import { describe, expect, it } from 'vitest'
import { classifyFormzahl } from '@/lib/tide/formzahl'
import { STAGES, STATION_VIEWS, formzahlRank, stageOf, viewsOf } from '@/lib/view/stages'

describe('station stages', () => {
  it('place every view in exactly one stage, so no published URL is orphaned', () => {
    for (const view of STATION_VIEWS) {
      const owners = STAGES.filter((stage) => viewsOf(stage).includes(view))
      expect(owners).toHaveLength(1)
      expect(stageOf(view)).toBe(owners[0])
    }
  })

  it('keep the inverse problem in order', () => {
    expect(STAGES).toEqual(['rekam', 'urai', 'uji', 'ramal'])
    expect(stageOf('catatan')).toBe('rekam')
    expect(stageOf('prediksi')).toBe('ramal')
  })

  it('group both checks under Uji', () => {
    expect(viewsOf('uji')).toEqual(['resolusi', 'banding'])
  })
})

describe('formzahl ramp position', () => {
  it('rises with F across the four classes', () => {
    const ranks = [0.1, 0.8, 2, 4].map((f) => formzahlRank(classifyFormzahl(f).type))
    expect(ranks).toEqual([1, 2, 3, 4])
  })
})
