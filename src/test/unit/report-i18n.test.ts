/**
 * Report dictionary + framework catalogue (api/_reportI18n.ts).
 * Pure functions — no DB, no PDF renderer.
 */
import {
  REPORT_FRAMEWORKS,
  REPORT_STRINGS_EN,
  REPORT_STRINGS_TH_LATIN_OVERLAY,
  REPORT_STRINGS_TH_OVERLAY,
  REPORT_STRINGS_ZH,
  countryLabel,
  displayCode,
  fmt,
  formatReportDate,
  formatReportValue,
  getReportFramework,
  makeReportT,
  normalizeReportLocale,
  pickLocalized,
  resolveReportLocale,
} from '../../../api/_reportI18n'
import { FRAMEWORKS } from '../../lib/frameworks'

const placeholders = (s: string) => Array.from(s.matchAll(/\{(\w+)\}/g), m => m[1]).sort()
const CJK = /[一-鿿]/

describe('report dictionary parity', () => {
  const enKeys = Object.keys(REPORT_STRINGS_EN).sort()
  const zhKeys = Object.keys(REPORT_STRINGS_ZH).sort()

  it('en and zh have exactly the same keys', () => {
    expect(zhKeys).toEqual(enKeys)
  })

  it.each(enKeys)('%s uses the same placeholders in en and zh', key => {
    const en = REPORT_STRINGS_EN[key as keyof typeof REPORT_STRINGS_EN]
    const zh = REPORT_STRINGS_ZH[key as keyof typeof REPORT_STRINGS_ZH]
    expect(zh.trim().length).toBeGreaterThan(0)
    expect(placeholders(zh)).toEqual(placeholders(en))
  })

  it('zh strings are actually Chinese (except symbols and code-only strings)', () => {
    const exempt = new Set(['general.notAvailable', 'cover.kicker', 'cover.fiscalYear', 'period.from', 'about.orgBody', 'chrome.page', 'doc.title'])
    for (const [key, value] of Object.entries(REPORT_STRINGS_ZH)) {
      if (exempt.has(key)) continue
      expect(CJK.test(value), key).toBe(true)
    }
  })

  it('Thai overlays only override existing keys, with the same placeholders plus {yearBE}', () => {
    for (const overlay of [REPORT_STRINGS_TH_OVERLAY, REPORT_STRINGS_TH_LATIN_OVERLAY]) {
      for (const [key, value] of Object.entries(overlay)) {
        const en = REPORT_STRINGS_EN[key as keyof typeof REPORT_STRINGS_EN]
        expect(en, key).toBeDefined()
        expect(placeholders(value!).filter(p => p !== 'yearBE')).toEqual(placeholders(en))
      }
    }
  })

  it('no hardcoded Thai or Buddhist-era year outside the th locale', () => {
    const t = makeReportT('en')
    expect(t('cover.fiscalYear', { label: 'FY2025', year: 2025, yearBE: 2568 })).toBe('FY2025 · Fiscal Year 2025')
    const zh = makeReportT('zh')
    expect(zh('cover.fiscalYear', { label: '2025年度', year: 2025, yearBE: 2568 })).toBe('2025年度 · 2025 财年')
    expect(JSON.stringify(REPORT_STRINGS_EN)).not.toMatch(/[฀-๿]/)
    expect(JSON.stringify(REPORT_STRINGS_ZH)).not.toMatch(/[฀-๿]/)
  })

  it('th keeps the bilingual cover with the Buddhist-era year', () => {
    const th = makeReportT('th', { thaiGlyphs: true })
    expect(th('cover.fiscalYear', { label: 'FY2025', year: 2025, yearBE: 2568 })).toContain('ปีบัญชี 2568')
    expect(th('cover.scanToVerify')).toContain('สแกนเพื่อตรวจสอบ')
    // Without a Thai font the year stays, in Latin script.
    const thLatin = makeReportT('th', { thaiGlyphs: false })
    expect(thLatin('cover.fiscalYear', { label: 'FY2025', year: 2025, yearBE: 2568 })).toBe('FY2025 · Fiscal Year 2025 · B.E. 2568')
    // Body text is English.
    expect(th('about.title')).toBe('About this report')
  })

  it('fmt leaves unknown placeholders untouched', () => {
    expect(fmt('{a} and {b}', { a: 1 })).toBe('1 and {b}')
  })
})

describe('report locale resolution', () => {
  it('normalises UI language tags', () => {
    expect(normalizeReportLocale('zh-CN')).toBe('zh')
    expect(normalizeReportLocale('zh_Hans')).toBe('zh')
    expect(normalizeReportLocale('en-GB')).toBe('en')
    expect(normalizeReportLocale('th-TH')).toBe('th')
    expect(normalizeReportLocale('fr')).toBeUndefined()
    expect(normalizeReportLocale(undefined)).toBeUndefined()
  })

  it('honours an explicit zh request for any org', () => {
    expect(resolveReportLocale('zh-CN', { country: 'GB' })).toBe('zh')
    expect(resolveReportLocale('zh', { country: 'TH', thai_name: 'บริษัท' })).toBe('zh')
  })

  it('keeps the Thai cover for Thai orgs publishing in English', () => {
    expect(resolveReportLocale('en', { country: 'TH' })).toBe('th')
    expect(resolveReportLocale(undefined, { country: null, thai_name: 'บริษัท ตัวอย่าง' })).toBe('th')
  })

  it('defaults mainland orgs to zh only when nothing was requested', () => {
    expect(resolveReportLocale(undefined, { country: 'CN' })).toBe('zh')
    expect(resolveReportLocale('en', { country: 'CN' })).toBe('en')
    expect(resolveReportLocale(undefined, { country: 'GB' })).toBe('en')
  })
})

describe('report formatting', () => {
  it('dates: ISO for en, 年月日 for zh', () => {
    expect(formatReportDate('2026-03-28T08:30:00.000Z', 'en')).toBe('2026-03-28')
    expect(formatReportDate('2026-03-28T08:30:00.000Z', 'zh')).toBe('2026年3月28日')
    expect(formatReportDate('2025-01-01', 'zh')).toBe('2025年1月1日')
    expect(formatReportDate(null, 'zh')).toBe('')
  })

  it('values: k/M for en, 万/亿 for zh', () => {
    expect(formatReportValue(182_450.6, 'en')).toBe('182.45k')
    expect(formatReportValue(2_500_000, 'en')).toBe('2.50M')
    expect(formatReportValue(182_450.6, 'zh')).toBe('18.25万')
    expect(formatReportValue(350_000_000, 'zh')).toBe('3.50亿')
    expect(formatReportValue(0.45, 'en')).toBe('0.45')
    expect(formatReportValue(12, 'zh')).toBe('12')
  })

  it('country codes become names', () => {
    expect(countryLabel('CN', 'zh')).toBe('中国')
    expect(countryLabel('CN', 'en')).toBe('China')
    expect(countryLabel('Atlantis', 'zh')).toBe('Atlantis')
  })

  it('pickLocalized falls back to English when zh is missing or blank', () => {
    expect(pickLocalized('Energy use', '能源利用', 'zh')).toBe('能源利用')
    expect(pickLocalized('Energy use', null, 'zh')).toBe('Energy use')
    expect(pickLocalized('Energy use', '  ', 'zh')).toBe('Energy use')
    expect(pickLocalized('Energy use', '能源利用', 'en')).toBe('Energy use')
  })
})

describe('report framework map', () => {
  const CN_IDS = ['cn-sse', 'cn-csds', 'hkex-esg', 'cass-esg']

  it('includes the China / Hong Kong frameworks', () => {
    for (const id of CN_IDS) expect(REPORT_FRAMEWORKS[id], id).toBeDefined()
  })

  it('covers every framework in the UI catalogue', () => {
    for (const fw of FRAMEWORKS) {
      expect(REPORT_FRAMEWORKS[fw.id], fw.id).toBeDefined()
      expect(REPORT_FRAMEWORKS[fw.id].code).toBe(fw.code)
    }
  })

  it('names the content index after the framework, not always GRI', () => {
    expect(getReportFramework('gri', 'en').indexTitle).toBe('GRI Content Index')
    expect(getReportFramework('cn-sse', 'zh').indexTitle).toBe('《可持续发展报告》指标索引')
    expect(getReportFramework('hkex-esg', 'en').indexTitle).toBe('ESG Reporting Code Content Index')
    expect(getReportFramework('hkex-esg', 'en').codeColumn).toBe('Aspect / KPI')
    for (const id of CN_IDS) {
      const zh = getReportFramework(id, 'zh')
      expect(CJK.test(zh.name), id).toBe(true)
      expect(CJK.test(zh.indexTitle), id).toBe(true)
      expect(CJK.test(zh.reportTitle), id).toBe(true)
      expect(zh.indexTitle).not.toMatch(/GRI/)
    }
  })

  it('shows HKEX KPI codes without the internal prefix', () => {
    const fw = getReportFramework('hkex-esg', 'zh')
    expect(displayCode('HKEX-A1.1', fw)).toBe('A1.1')
    expect(displayCode('CNSSE-GEN-1', getReportFramework('cn-sse', 'zh'))).toBe('CNSSE-GEN-1')
  })

  it('gives unknown ids a generic shell instead of the raw id', () => {
    const fw = getReportFramework('foo-bar', 'zh')
    expect(fw.code).toBe('FOO-BAR')
    expect(fw.reportTitle).toBe('可持续发展报告')
  })
})
