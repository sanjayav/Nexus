/**
 * CJK line breaking + font registration for the PDF report (api/_reportFonts.ts).
 */
import { statSync } from 'node:fs'
import { join } from 'node:path'
import { cjkHyphenationCallback, needsUnicodeFont, pickReportFontFamily, resolveFontDir } from '../../../api/_reportFonts'

/** Break opportunities = the non-empty parts; '' markers are zero-width glue. */
const pieces = (word: string) => cjkHyphenationCallback(word).filter(p => p !== '')

describe('cjkHyphenationCallback', () => {
  it('splits a CJK run into single characters', () => {
    expect(pieces('可持续发展')).toEqual(['可', '持', '续', '发', '展'])
  })

  it('interleaves empty parts so breaks never print a hyphen', () => {
    expect(cjkHyphenationCallback('报告')).toEqual(['报', '', '告', ''])
  })

  it('always joins back to the original word', () => {
    for (const w of ['可持续发展报告', '范围1和范围2温室气体（tCO2e/万元）降低25%。', '“零容忍”原则，', 'ISO14001认证']) {
      expect(cjkHyphenationCallback(w).join('')).toBe(w)
    }
  })

  it('keeps Latin words and numbers intact', () => {
    expect(pieces('采购GWh级别PPA合同2025年')).toEqual(['采', '购', 'GWh', '级', '别', 'PPA', '合', '同', '2025', '年'])
    expect(pieces('ISO14001认证')).toEqual(['ISO14001', '认', '证'])
  })

  it('returns non-CJK words whole (no English auto-hyphenation)', () => {
    expect(cjkHyphenationCallback('internationalisation')).toEqual(['internationalisation'])
    expect(cjkHyphenationCallback(' ')).toEqual([' '])
    expect(cjkHyphenationCallback('')).toEqual([''])
  })

  it('never starts a line with closing punctuation (kinsoku)', () => {
    const parts = pieces('报告期内，公司完成了目标。')
    expect(parts).toContain('内，')
    expect(parts[parts.length - 1]).toBe('标。')
    for (const p of parts) expect('，。、；：！？）》」'.includes(p[0]), p).toBe(false)
  })

  it('never ends a line with an opening bracket', () => {
    const parts = pieces('《碳达峰行动方案》')
    expect(parts[0]).toBe('《碳')
    expect(parts[parts.length - 1]).toBe('案》')
    // A word that ends in an opening bracket breaks before it, never after it.
    expect(cjkHyphenationCallback('强度（')).toEqual(['强', '', '度', '', '（'])
  })
})

describe('report font selection', () => {
  const fonts = { cjk: true, thai: false, dir: '/x' }

  it('keeps Helvetica for all-Latin English reports', () => {
    expect(needsUnicodeFont('Scope 1 — tCO₂e')).toBe(true) // subscript ₂ is outside WinAnsi
    expect(needsUnicodeFont('Scope 1 – 2025 “quoted” · €')).toBe(false)
    expect(pickReportFontFamily({ locale: 'en', text: 'Acme plc', fonts })).toBe('Helvetica')
  })

  it('switches to Noto Sans SC for zh or any CJK content', () => {
    expect(pickReportFontFamily({ locale: 'zh', text: 'Acme', fonts })).toBe('NotoSansSC')
    expect(pickReportFontFamily({ locale: 'en', text: '绿源控股集团', fonts })).toBe('NotoSansSC')
    expect(pickReportFontFamily({ locale: 'th', text: 'x', fonts: { ...fonts, thai: true } })).toEqual(['NotoSansSC', 'NotoSansThai'])
  })

  it('falls back to Helvetica if the font files are missing', () => {
    expect(pickReportFontFamily({ locale: 'zh', text: '绿源', fonts: { cjk: false, thai: false, dir: null } })).toBe('Helvetica')
  })

  it('ships static Noto Sans SC TTFs with the function', () => {
    const dir = resolveFontDir()
    expect(dir).not.toBeNull()
    for (const f of ['NotoSansSC-Regular.ttf', 'NotoSansSC-Bold.ttf', 'OFL.txt']) {
      const st = statSync(join(dir!, f))
      expect(st.size).toBeGreaterThan(0)
      if (f.endsWith('.ttf')) expect(st.size).toBeLessThan(15 * 1024 * 1024)
    }
  })
})
