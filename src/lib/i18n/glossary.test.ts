import { describe, expect, it } from 'vitest'
import { GLOSSARY, ZH_BANNED } from './glossary'

/**
 * Terminology gate: every zh string in every dictionary must follow the house
 * glossary. Dictionaries are discovered by file name, so new features are
 * covered without registering anything.
 */
const modules = import.meta.glob<Record<string, unknown>>(['/src/**/*.strings.ts', '/src/lib/i18n/shared/*.ts'], { eager: true })

function zhLeaves(value: unknown, path: string, out: { path: string; text: string }[]) {
  if (typeof value === 'string') out.push({ path, text: value })
  else if (Array.isArray(value)) value.forEach((v, i) => zhLeaves(v, `${path}[${i}]`, out))
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) zhLeaves(v, `${path}.${k}`, out)
}

const strings: { path: string; text: string }[] = []
for (const [file, mod] of Object.entries(modules)) {
  for (const [name, dict] of Object.entries(mod)) {
    if (dict && typeof dict === 'object' && 'en' in dict && 'zh' in dict) zhLeaves((dict as { zh: unknown }).zh, `${file}#${name}`, strings)
  }
}

describe('Chinese terminology', () => {
  it('finds the dictionaries', () => {
    expect(Object.keys(modules).length).toBeGreaterThan(20)
    expect(strings.length).toBeGreaterThan(500)
  })

  for (const rule of ZH_BANNED) {
    it(`does not use ${rule.pattern.source} (use ${rule.use})`, () => {
      const hits = strings.filter(s => rule.pattern.test(s.text)).map(s => `${s.path}: ${s.text}`)
      expect(hits, `${rule.why}`).toEqual([])
    })
  }

  it('uses full-width punctuation inside Chinese sentences', () => {
    // A half-width comma or colon directly between two CJK characters is a typo.
    const hits = strings.filter(s => /[一-鿿][,:;][一-鿿]/.test(s.text)).map(s => `${s.path}: ${s.text}`)
    expect(hits).toEqual([])
  })

  it('every glossary entry is bilingual', () => {
    for (const [key, e] of Object.entries(GLOSSARY)) {
      expect(e.term.zh && e.term.en && e.plain.zh && e.plain.en, key).toBeTruthy()
    }
  })
})
