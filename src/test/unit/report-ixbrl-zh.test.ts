/**
 * iXBRL language + China units (api/_ixbrl.ts, api/_ixbrlTaxonomy.ts).
 */
import { generateIxbrl, generateUnits, validateIxbrl } from '../../../api/_ixbrl'
import { CONCEPT_LABELS_ZH, NAMESPACES, conceptLabel, getConceptById } from '../../../api/_ixbrlTaxonomy'

describe('iXBRL China units', () => {
  it('declares CNY as an ISO 4217 measure and tce in the Nexus unit namespace', () => {
    const xml = generateUnits(['CNY', 'RMB', 'HKD', 'tce'])
    expect(xml).toContain('<xbrli:measure>iso4217:CNY</xbrli:measure>')
    expect(xml).toContain('<xbrli:measure>iso4217:HKD</xbrli:measure>')
    expect(xml).toContain('<xbrli:measure>nexus:tce</xbrli:measure>')
    expect(xml).not.toContain('utr:tce')
    expect(NAMESPACES.nexus).toMatch(/^http/)
  })
})

describe('iXBRL document language', () => {
  it('sets xml:lang on the root element', async () => {
    const zh = await generateIxbrl('r1', [], {}, 'zh-CN')
    expect(zh).toMatch(/<html[^>]*xml:lang="zh-CN"/)
    expect(validateIxbrl(zh).valid).toBe(true)
    const en = await generateIxbrl('r1', [], {})
    expect(en).toMatch(/<html[^>]*xml:lang="en"/)
  })

  it('has zh-CN labels for the core GHG concepts, with an English fallback', () => {
    const s1 = getConceptById('esrs:GrossScope1GreenhouseGasEmissions')!
    expect(conceptLabel(s1, 'zh')).toEqual({ text: '范围一温室气体排放总量', lang: 'zh-CN' })
    expect(conceptLabel(s1, 'en')).toEqual({ text: s1.label, lang: 'en' })
    const noZh = { id: 'esrs:Nope', label: 'Nope' }
    expect(conceptLabel(noZh, 'zh')).toEqual({ text: 'Nope', lang: 'en' })
    for (const id of Object.keys(CONCEPT_LABELS_ZH)) expect(getConceptById(id), id).toBeDefined()
  })
})
