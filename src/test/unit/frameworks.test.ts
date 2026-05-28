import {
  FRAMEWORKS,
  getActiveFrameworks,
  getFramework,
  DEFAULT_FRAMEWORK_ID,
} from '../../lib/frameworks'

describe('Framework catalog', () => {
  it('exposes a non-empty catalog', () => {
    expect(FRAMEWORKS.length).toBeGreaterThan(10)
  })

  it('every entry has a stable id, code, name and status', () => {
    for (const f of FRAMEWORKS) {
      expect(f.id).toMatch(/^[a-z0-9][a-z0-9-]*$/)
      expect(f.code.length).toBeGreaterThan(0)
      expect(f.name.length).toBeGreaterThan(0)
      expect(['active', 'coming_soon', 'disabled']).toContain(f.status)
    }
  })

  it('ids are unique', () => {
    const ids = FRAMEWORKS.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('default framework id resolves to an active framework', () => {
    const f = getFramework(DEFAULT_FRAMEWORK_ID)
    expect(f).toBeDefined()
    expect(f?.status).toBe('active')
  })

  const expectedActive = [
    'gri',
    'csrd-e1',
    'csrd-s1',
    'issb-s2',
    'cdp-2024',
    'tcfd',
  ]

  expectedActive.forEach(id => {
    it(`includes active framework: ${id}`, () => {
      const f = getFramework(id)
      expect(f).toBeDefined()
      expect(f!.status).toBe('active')
    })
  })

  it('every active framework with questionCount has a positive integer', () => {
    for (const f of getActiveFrameworks()) {
      if (f.questionCount !== undefined) {
        expect(Number.isInteger(f.questionCount)).toBe(true)
        expect(f.questionCount).toBeGreaterThan(0)
      }
    }
  })

  it('getFramework returns undefined for unknown ids', () => {
    expect(getFramework('not-a-framework')).toBeUndefined()
  })
})
