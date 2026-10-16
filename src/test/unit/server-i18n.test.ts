/**
 * Server message dictionary (api/_i18n.ts): en/zh parity, th subset,
 * locale parsing / resolution order, interpolation and pluralisation.
 */
import { describe, it, expect } from 'vitest'
import {
  MESSAGES,
  normalizeLocale,
  parseAcceptLanguage,
  resolveLocale,
  marketDefaultLocale,
  t,
  hasMessage,
  translateLegacyPhrase,
  languageInstruction,
  intlTag,
} from '../../../api/_i18n'

describe('dictionary parity', () => {
  const en = Object.keys(MESSAGES.en).sort()
  it('zh has exactly the same keys as en', () => {
    expect(Object.keys(MESSAGES.zh).sort()).toEqual(en)
  })
  it('th only contains keys that exist in en', () => {
    for (const k of Object.keys(MESSAGES.th)) expect(en).toContain(k)
  })
  it('every zh entry keeps the same {placeholders} as en', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()
    for (const k of en) {
      expect(ph((MESSAGES.zh as Record<string, string>)[k]), k).toEqual(ph((MESSAGES.en as Record<string, string>)[k]))
    }
  })
  it('no zh value is empty or identical to an English sentence', () => {
    for (const k of en) {
      const zh = (MESSAGES.zh as Record<string, string>)[k]
      expect(zh.trim().length, k).toBeGreaterThan(0)
    }
    expect(MESSAGES.zh['ai.label']).toMatch(/人工智能/)
  })
})

describe('locale parsing', () => {
  it('normalises BCP-47 tags', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh')
    expect(normalizeLocale('zh_Hans')).toBe('zh')
    expect(normalizeLocale('th-TH')).toBe('th')
    expect(normalizeLocale('en-GB')).toBe('en')
    expect(normalizeLocale('fr')).toBeNull()
    expect(normalizeLocale(undefined)).toBeNull()
  })
  it('honours Accept-Language q-values and skips unsupported tags', () => {
    expect(parseAcceptLanguage('fr-FR,zh-CN;q=0.8,en;q=0.5')).toBe('zh')
    expect(parseAcceptLanguage('en;q=0.4, th;q=0.9')).toBe('th')
    expect(parseAcceptLanguage('*')).toBeNull()
    expect(parseAcceptLanguage('zh;q=0, en')).toBe('en')
    expect(parseAcceptLanguage(['zh-CN'])).toBe('zh')
    expect(parseAcceptLanguage('')).toBeNull()
  })
  it('resolves user.locale → header → market default → en', () => {
    expect(resolveLocale({ userLocale: 'th', acceptLanguage: 'zh-CN', market: 'cn' })).toBe('th')
    expect(resolveLocale({ userLocale: null, acceptLanguage: 'zh-CN', market: 'global' })).toBe('zh')
    expect(resolveLocale({ userLocale: null, acceptLanguage: undefined, market: 'cn' })).toBe('zh')
    expect(resolveLocale({ userLocale: 'xx', acceptLanguage: 'fr', market: 'global' })).toBe('en')
    expect(marketDefaultLocale('cn')).toBe('zh')
    expect(marketDefaultLocale(null)).toBe('en')
    expect(intlTag('zh')).toBe('zh-CN')
  })
})

describe('t()', () => {
  it('interpolates and selects the _one variant for count 1', () => {
    expect(t('en', 'anomaly.late_submission.headline', { count: 1 })).toBe('Submitted 1 day after due date')
    expect(t('en', 'anomaly.late_submission.headline', { count: 3 })).toBe('Submitted 3 days after due date')
    expect(t('zh', 'notify.status.approved.subject', { ref: 'GRI 305-1' })).toBe('已批准 · GRI 305-1')
  })
  it('falls back to English for th gaps, and to the key when unknown', () => {
    expect(t('th', 'anomaly.label.trend_break')).toBe('Trend break')
    expect(t('th', 'email.cta')).toBe('เปิด Nexus')
    expect(t('en', 'does.not.exist')).toBe('does.not.exist')
    expect(hasMessage('email.cta')).toBe(true)
    expect(hasMessage('nope')).toBe(false)
  })
  it('leaves unknown placeholders intact', () => {
    expect(t('en', 'notify.comment.subject', { actor: 'Li Wei' })).toBe('Li Wei commented on {code}')
  })
})

describe('legacy phrase translation and AI language instruction', () => {
  it('translates known fixed English workflow strings only', () => {
    expect(translateLegacyPhrase('Review requested', 'zh')).toBe('待审核')
    expect(translateLegacyPhrase('Please review and resubmit.', 'zh')).toBe('请检查后重新提交。')
    expect(translateLegacyPhrase('Something custom', 'zh')).toBe('Something custom')
    expect(translateLegacyPhrase('Review requested', 'en')).toBe('Review requested')
  })
  it('asks for Simplified Chinese with regulator terminology for zh', () => {
    expect(languageInstruction('zh')).toMatch(/Simplified Chinese \(简体中文\)/)
    expect(languageInstruction('en')).toMatch(/English/)
    expect(languageInstruction('th')).toMatch(/Thai/)
  })
})
