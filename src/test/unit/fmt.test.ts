import { fmt } from '../../lib/fmt'

describe('fmt', () => {
  it('formats exact values with grouping and chemical subscripts', () => {
    expect(fmt.exact(1937.3, 'tCO2e', { locale: 'en-GB' })).toBe('1,937.3 tCO₂e')
    expect(fmt.exact('4749.125', 'GJ', { locale: 'en-GB' })).toBe('4,749.125 GJ')
  })

  it('compacts with 万/亿 in Chinese and K/M in English', () => {
    expect(fmt.compact(19373, { locale: 'zh-CN' })).toBe('1.9万')
    expect(fmt.compact(320_000_000, { locale: 'zh-CN' })).toBe('3.2亿')
    expect(fmt.compact(19373, { locale: 'en-GB' })).toBe('19.4K')
    expect(fmt.compact(950, { locale: 'zh-CN' })).toBe('950')
  })

  it('is null-safe and coerces NUMERIC strings', () => {
    expect(fmt.number(null)).toBe('—')
    expect(fmt.number('abc')).toBe('—')
    expect(fmt.number('1234.5', { locale: 'en-GB' })).toBe('1,234.5')
  })

  it('signs deltas with a true minus', () => {
    expect(fmt.delta(12.34, { percent: true, locale: 'en-GB' })).toBe('+12.3%')
    expect(fmt.delta(-3, { locale: 'en-GB' })).toBe('−3')
  })

  it('keeps bare ISO dates on their calendar day in any zone', () => {
    expect(fmt.date('2026-10-10', { style: 'iso', timeZone: 'Pacific/Kiritimati' })).toBe('2026-10-10')
    expect(fmt.date('2026-10-10', { style: 'iso', timeZone: 'America/Los_Angeles' })).toBe('2026-10-10')
    expect(fmt.date('2026-10-10', { style: 'short', locale: 'zh-CN', timeZone: 'Asia/Shanghai' })).toBe('10月10日')
  })
})
