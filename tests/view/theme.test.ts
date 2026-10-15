import { describe, expect, it } from 'vitest'
import { THEME_BOOT_SCRIPT, THEMES, isThemeChoice, nextTheme, type ThemeChoice } from '@/lib/view/theme'

describe('theme choice', () => {
  it('cycles through every state and returns to the start', () => {
    let state: ThemeChoice = THEMES[0]
    const seen = new Set<string>()
    for (let i = 0; i < THEMES.length; i++) {
      seen.add(state)
      state = nextTheme(state)
    }
    expect(seen.size).toBe(THEMES.length)
    expect(state).toBe(THEMES[0])
  })

  it('rejects anything storage could hand back that is not a theme', () => {
    expect(isThemeChoice('dark')).toBe(true)
    expect(isThemeChoice('sepia')).toBe(false)
    expect(isThemeChoice(null)).toBe(false)
  })

  it('boot script only ever pins light or dark, and survives storage throwing', () => {
    expect(THEME_BOOT_SCRIPT).toContain("t==='light'||t==='dark'")
    expect(THEME_BOOT_SCRIPT).toMatch(/^\(function\(\)\{try\{/)
    // Runs without a DOM or storage and does not throw.
    expect(() => new Function(THEME_BOOT_SCRIPT)()).not.toThrow()
  })
})
