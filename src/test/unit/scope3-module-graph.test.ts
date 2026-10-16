// Regression: /calculators/scope3 crashed in the browser because category modules
// imported shared constants from ./index while ./index imported the categories —
// a cycle that left REGION_OPTIONS / EEIO_SECTOR_OPTIONS in the TDZ when cat01
// evaluated first. Each module is now imported as the *first* entry of a fresh
// module graph, so any re-introduced cycle surfaces here.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(__dirname, '../../calculators/scope3')
const CATEGORY_FILES = readdirSync(DIR).filter(f => /^cat\d\d_.*\.ts$/.test(f)).sort()

describe('scope3 module graph', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('has all 15 category modules', () => {
    expect(CATEGORY_FILES).toHaveLength(15)
  })

  it('category modules never import the registry (./index)', () => {
    for (const f of CATEGORY_FILES) {
      const src = readFileSync(join(DIR, f), 'utf8')
      expect(src, f).not.toMatch(/from '\.\/index'|from '\.'/)
    }
  })

  it('leaf modules (types, constants) import nothing from the registry', () => {
    for (const f of ['types.ts', 'constants.ts']) {
      const src = readFileSync(join(DIR, f), 'utf8')
      expect(src, f).not.toMatch(/^import /m)
    }
  })

  it('index evaluates with every calculator defined', async () => {
    const mod = await import('../../calculators/scope3')
    expect(mod.SCOPE3_CALCULATORS).toHaveLength(15)
    mod.SCOPE3_CALCULATORS.forEach((c, i) => {
      expect(c, `category ${i + 1}`).toBeDefined()
      expect(c.category).toBe(i + 1)
      expect(c.methods.length).toBeGreaterThan(0)
    })
    expect(mod.REGION_OPTIONS.length).toBeGreaterThan(0)
    expect(mod.EEIO_SECTOR_OPTIONS.length).toBeGreaterThan(0)
  })

  it.each(CATEGORY_FILES)('%s evaluates first in a fresh graph', async (file) => {
    const mod = await import(`../../calculators/scope3/${file.replace(/\.ts$/, '')}.ts`)
    const calc = Object.values(mod)[0] as { methods: { inputs: { options?: unknown[] }[] }[] }
    expect(calc).toBeDefined()
    for (const m of calc.methods) {
      for (const input of m.inputs) {
        if (input.options) {
          expect(Array.isArray(input.options)).toBe(true)
          expect(input.options.every(o => o !== undefined)).toBe(true)
        }
      }
    }
    // And the registry still resolves after the category was loaded first.
    const idx = await import('../../calculators/scope3')
    expect(idx.SCOPE3_CALCULATORS.every(Boolean)).toBe(true)
  })

  it('cat01 spend-based exposes region + sector options', async () => {
    const { cat01 } = await import('../../calculators/scope3/cat01_purchasedGoods')
    const { REGION_OPTIONS, EEIO_SECTOR_OPTIONS } = await import('../../calculators/scope3/constants')
    const inputs = cat01.methods.flatMap(m => m.inputs)
    const opts = inputs.filter(i => i.options).map(i => i.options)
    expect(opts).toContainEqual(REGION_OPTIONS)
    expect(opts).toContainEqual(EEIO_SECTOR_OPTIONS)
  })
})
