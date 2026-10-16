import i18n from '../../i18n'
import { CALCULATORS, CN_GRID_URL } from '../../calculators/registry'
import { localizeCalc } from '../../calculators/labels'
import type { NexusQuestionnaireItem } from '../../lib/api'

const scope2 = CALCULATORS.find(c => c.id === 'scope-2-electricity')!
const grid = scope2.inputs.find(i => i.key === 'grid')!
const item = { gri_code: '305-2 (2016)', line_item: 'Energy indirect', unit: 'tons CO2e' } as unknown as NexusQuestionnaireItem

// kgCO2e per MWh (= kgCO2e/kWh × 1000) — MEE/NBS 2023, published 2025-12-31.
const CN: Record<string, number> = {
  'cn-location': 530.6,
  'cn-market': 609.6,
  'cn-north': 636.1,
  'cn-northeast': 512.2,
  'cn-east': 550,
  'cn-central': 527.1,
  'cn-northwest': 554.3,
  'cn-south': 404.2,
  'cn-southwest': 247.2,
}

describe('Scope 2 grid options', () => {
  afterEach(async () => { await i18n.changeLanguage('en') })

  it('keeps the existing Thailand / REC / PPA options', () => {
    const values = grid.options!.map(o => o.value)
    expect(values).toEqual(expect.arrayContaining(['th-location', 'th-market', 'rec-backed', 'ppa-solar']))
  })

  it('offers the China national, residual and seven regional grids', () => {
    for (const [value, factor] of Object.entries(CN)) {
      const opt = grid.options!.find(o => o.value === value)
      expect(opt, value).toBeDefined()
      expect(opt!.factor).toBeCloseTo(factor, 6)
      expect(opt!.note).toContain('MEE/NBS 2023 (published 2025-12-31)')
      expect(opt!.note).toContain(CN_GRID_URL)
    }
  })

  it('computes tCO2e with a China regional factor', () => {
    // 1,000 MWh × 550 kg/MWh = 550,000 kg = 550 t
    expect(scope2.compute({ grid: 'cn-east', mwh: '1000' }, item)).toBeCloseTo(550, 6)
  })

  it('has zh labels and notes for every China option', async () => {
    await i18n.changeLanguage('zh')
    const zh = localizeCalc(i18n.t.bind(i18n), scope2)
    const zhGrid = zh.inputs.find(i => i.key === 'grid')!
    for (const value of Object.keys(CN)) {
      const opt = zhGrid.options!.find(o => o.value === value)!
      expect(opt.label, value).toMatch(/中国/)
      expect(opt.note, value).toMatch(/生态环境部/)
    }
    expect(zh.footnotes!.some(f => f.startsWith('中国电网排放因子'))).toBe(true)
  })
})
