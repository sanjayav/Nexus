import { describe, expect, it } from 'vitest'
import { PRODUCTS_DATA, type CbamLine } from './data'
import { baselineScenario, cbamExposure, embeddedOf, pcfOf, readiness, scenarioStages, seeOf } from './model'

const products = [...PRODUCTS_DATA.lvyuan.products, ...PRODUCTS_DATA.aeiforo.products]

describe('product footprint what-if', () => {
  it.each(products.map(p => [p.id, p] as const))('%s: baseline scenario equals the declared footprint', (_, p) => {
    expect(pcfOf(scenarioStages(p, baselineScenario(p)))).toBeCloseTo(pcfOf(p.stages), 9)
  })

  it.each(products.map(p => [p.id, p] as const))('%s: more green power never raises the footprint and never goes negative', (_, p) => {
    const base = pcfOf(p.stages)
    const full = scenarioStages(p, { ...baselineScenario(p), green: 100, recycled: 100 })
    expect(pcfOf(full)).toBeLessThanOrEqual(base + 1e-9)
    for (const v of Object.values(full)) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('is linear in the green-power share, as documented', () => {
    const p = PRODUCTS_DATA.lvyuan.products.find(x => x.electricity.kwhPerUnit > 0)!
    const b = baselineScenario(p)
    const d10 = pcfOf(p.stages) - pcfOf(scenarioStages(p, { ...b, green: Math.min(100, b.green + 10) }))
    const expected = ((p.electricity.kwhPerUnit * (Math.min(100, b.green + 10) - b.green)) / 100) * p.electricity.factor
    expect(d10).toBeCloseTo(expected, 6)
  })
})

describe('battery passport readiness', () => {
  it('counts in-progress at half weight', () => {
    expect(readiness(['done', 'inProgress', 'notStarted', 'blocked'])).toBe(37.5)
    expect(readiness([])).toBe(0)
  })
})

describe('CBAM exposure', () => {
  const line: CbamLine = {
    id: 'l',
    good: 'frame',
    cnCode: '7604',
    category: 'aluminium',
    installation: 'x',
    tonnes: 100,
    actual: { direct: 1.5, indirect: 6 },
    defaults: { direct: 2, indirect: 8 },
    basis: 'actual',
    verification: 'verified',
  }

  it('uses actual values when reported, defaults otherwise', () => {
    expect(seeOf(line, false)).toBe(1.5)
    expect(seeOf({ ...line, basis: 'default' }, false)).toBe(2)
    expect(seeOf(line, true)).toBe(7.5)
  })

  it('is tonnes × embedded emissions × price', () => {
    expect(embeddedOf(line, false)).toBe(150)
    expect(cbamExposure([line, { ...line, id: 'm', basis: 'default' }], 75, false)).toBe((150 + 200) * 75)
  })
})
