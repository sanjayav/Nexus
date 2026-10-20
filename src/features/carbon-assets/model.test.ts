import { describe, expect, it } from 'vitest'
import { mockDataCN } from '@/data/seed.cn'
import { mockData } from '@/data/seed.global'
import { REGIONS } from '@/config/regions'
import { CARBON_ASSETS_DATA } from './data'
import { creditTotals, reconcileScope2 } from './model'

describe('market-based Scope 2 reconciliation', () => {
  it('reproduces the CN seed figure from the green-power ledger', () => {
    const r = reconcileScope2(mockDataCN.ghg.scope2Location.value, REGIONS.cn.gridFactor.value, CARBON_ASSETS_DATA.lvyuan.contracts)
    expect(r.instrumentMWh).toBe(620_000)
    expect(Math.round(r.market)).toBe(mockDataCN.ghg.scope2Market.value)
  })

  it('reproduces the global seed figure from I-RECs', () => {
    const r = reconcileScope2(mockData.ghg.scope2Location.value, REGIONS.global.gridFactor.value, CARBON_ASSETS_DATA.aeiforo.contracts)
    expect(Math.abs(r.market - mockData.ghg.scope2Market.value)).toBeLessThan(1)
  })

  it('never credits more green power than grid electricity consumed', () => {
    const r = reconcileScope2(1000, 0.5, [{ id: 'x', type: 'gec', mwh: 1_000_000 } as never])
    expect(r.covered).toBe(r.gridMWh)
    expect(r.market).toBe(0)
  })

  it('ignores self-generated power as an instrument', () => {
    const r = reconcileScope2(1000, 0.5, [{ id: 's', type: 'self', mwh: 500 } as never])
    expect(r.selfMWh).toBe(500)
    expect(r.market).toBe(1000)
  })
})

describe('carbon credits', () => {
  it('separates held, retired and retired-for-disclosure', () => {
    const t = creditTotals([
      { acquired: 100, retired: 40, retiredForDisclosure: true } as never,
      { acquired: 50, retired: 10, retiredForDisclosure: false } as never,
    ])
    expect(t).toEqual({ acquired: 150, retired: 50, held: 100, disclosed: 40 })
  })
})
