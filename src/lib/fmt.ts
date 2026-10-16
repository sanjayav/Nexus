import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import i18n from '../i18n'

/**
 * fmt — locale-aware number, unit and date formatting (Intl only).
 *
 * Locale follows the UI language (i18n): zh → zh-CN, th → th-TH, else en-GB.
 * Rules of use:
 *   · Review / approval / entry show EXACT values: `fmt.exact(1937.3, 'tCO2e')`
 *     → "1,937.3 tCO₂e". Never compact a figure someone is signing off.
 *   · Charts and KPI tiles may compact: `fmt.compact(19373)` → "19K" (en),
 *     "1.9万" (zh). Chinese compact uses 万/亿, not K/M.
 *   · Every helper is null-safe and accepts numeric strings (Postgres NUMERIC
 *     arrives as a string) — bad input renders an em dash.
 *
 * In components prefer `const f = useFmt()` so output re-renders on language
 * change; the bare `fmt` object reads the current language at call time.
 */

export type Numeric = number | string | null | undefined

export const EMPTY = '—'

export function localeFor(lng?: string): string {
  const l = (lng ?? i18n.language ?? 'en').toLowerCase()
  if (l.startsWith('zh')) return 'zh-CN'
  if (l.startsWith('th')) return 'th-TH'
  return 'en-GB'
}

export function toNumber(n: Numeric): number | null {
  if (n == null || n === '') return null
  const v = typeof n === 'number' ? n : Number(String(n).replace(/,/g, ''))
  return Number.isFinite(v) ? v : null
}

const nfCache = new Map<string, Intl.NumberFormat>()
function nf(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(opts)
  let f = nfCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, opts)
    nfCache.set(key, f)
  }
  return f
}

/** Subscript digits for chemical units: tCO2e → tCO₂e, CH4 → CH₄. */
export function unit(u?: string | null): string {
  if (!u) return ''
  return u.replace(/(CO|CH|N|O|SF|NF)(\d)/g, (_, a: string, d: string) => a + String.fromCharCode(0x2080 + Number(d)))
}

export interface NumberOpts {
  /** Exact number of fraction digits. */
  precision?: number
  /** Upper bound on fraction digits when precision is not fixed. Default 2. */
  maxFraction?: number
  /** Always show the sign (+/−). */
  signed?: boolean
  locale?: string
}

function number(n: Numeric, o: NumberOpts = {}): string {
  const v = toNumber(n)
  if (v == null) return EMPTY
  const locale = o.locale ?? localeFor()
  const opts: Intl.NumberFormatOptions =
    o.precision != null
      ? { minimumFractionDigits: o.precision, maximumFractionDigits: o.precision }
      : { maximumFractionDigits: o.maxFraction ?? 2 }
  if (o.signed) opts.signDisplay = 'exceptZero'
  return nf(locale, opts).format(v).replace('-', '−')
}

/** Full-precision value (up to 6 decimals, no rounding surprises). */
function exact(n: Numeric, u?: string | null, o: Omit<NumberOpts, 'maxFraction'> = {}): string {
  const s = number(n, { ...o, maxFraction: o.precision ?? 6 })
  if (s === EMPTY || !u) return s
  return `${s} ${unit(u)}`
}

/** Compact for charts and KPI tiles: 19K / 1.9M (en), 1.9万 / 3.2亿 (zh). */
function compact(n: Numeric, o: { maxFraction?: number; locale?: string } = {}): string {
  const v = toNumber(n)
  if (v == null) return EMPTY
  const locale = o.locale ?? localeFor()
  if (Math.abs(v) < 1000 && !locale.startsWith('zh')) return number(v, { maxFraction: o.maxFraction ?? 1, locale })
  if (locale.startsWith('zh') && Math.abs(v) < 10000) return number(v, { maxFraction: o.maxFraction ?? 1, locale })
  return nf(locale, { notation: 'compact', maximumFractionDigits: o.maxFraction ?? 1 }).format(v).replace('-', '−')
}

/** Percent. Pass `ratio: true` when the input is 0–1. */
function percent(n: Numeric, o: { precision?: number; ratio?: boolean; signed?: boolean; locale?: string } = {}): string {
  const v = toNumber(n)
  if (v == null) return EMPTY
  const locale = o.locale ?? localeFor()
  const opts: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: o.precision ?? 0,
    maximumFractionDigits: o.precision ?? 0,
  }
  if (o.signed) opts.signDisplay = 'exceptZero'
  return nf(locale, opts).format(o.ratio ? v : v / 100).replace('-', '−')
}

/** Value with unit; `compact: true` for charts/KPIs, otherwise grouped with up to 2 decimals. */
function value(n: Numeric, u?: string | null, o: NumberOpts & { compact?: boolean } = {}): string {
  const s = o.compact ? compact(n, { maxFraction: o.maxFraction, locale: o.locale }) : number(n, o)
  if (s === EMPTY || !u) return s
  return `${s} ${unit(u)}`
}

/** Signed delta for change chips: +12.4% / −3. */
function delta(n: Numeric, o: { percent?: boolean; precision?: number; locale?: string } = {}): string {
  if (o.percent) return percent(n, { precision: o.precision ?? 1, signed: true, locale: o.locale })
  return number(n, { precision: o.precision, maxFraction: 1, signed: true, locale: o.locale })
}

export interface DateOpts {
  /** short: 10 Oct · 10月10日   medium: 10 Oct 2026 · 2026年10月10日   long: adds weekday   iso: 2026-10-10 */
  style?: 'short' | 'medium' | 'long' | 'iso'
  /** IANA zone, e.g. 'Asia/Shanghai'. Default: the viewer's zone. */
  timeZone?: string
  locale?: string
}

function toDate(d: Date | string | number | null | undefined): Date | null {
  if (d == null || d === '') return null
  // Bare ISO dates (2026-10-10) are calendar days — parsed at noon UTC and formatted in UTC.
  const date = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00:00Z') : new Date(d)
  return Number.isNaN(date.getTime()) ? null : date
}

const isDateOnly = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)

function date(d: Date | string | number | null | undefined, o: DateOpts = {}): string {
  const v = toDate(d)
  if (!v) return EMPTY
  const locale = o.locale ?? localeFor()
  const style = o.style ?? 'medium'
  // A bare calendar date (due dates, period ends) is the same day everywhere.
  const timeZone = isDateOnly(d) ? 'UTC' : o.timeZone
  if (style === 'iso') {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(v)
  }
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { month: 'short', day: 'numeric' }
      : style === 'long'
        ? { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' }
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone }).format(v)
}

function dateTime(d: Date | string | number | null | undefined, o: Omit<DateOpts, 'style'> & { seconds?: boolean } = {}): string {
  const v = toDate(d)
  if (!v) return EMPTY
  const locale = o.locale ?? localeFor()
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    second: o.seconds ? '2-digit' : undefined, timeZone: o.timeZone, timeZoneName: o.timeZone ? 'short' : undefined,
  }).format(v)
}

/** "3 days ago" / "in 2 hours" / "3天前". */
function relative(d: Date | string | number | null | undefined, o: { now?: number; locale?: string } = {}): string {
  const v = toDate(d)
  if (!v) return EMPTY
  const locale = o.locale ?? localeFor()
  const diff = (v.getTime() - (o.now ?? Date.now())) / 1000
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (abs < 45) return rtf.format(Math.round(diff), 'second')
  if (abs < 2700) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 64800) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 26) return rtf.format(Math.round(diff / 86400), 'day')
  if (abs < 86400 * 320) return rtf.format(Math.round(diff / (86400 * 30)), 'month')
  return rtf.format(Math.round(diff / (86400 * 365)), 'year')
}

export const fmt = { number, exact, compact, percent, value, delta, unit, date, dateTime, relative, toNumber, localeFor }
export type Fmt = typeof fmt

/** Hook form — re-binds to the active language so output updates on switch. */
export function useFmt(): Fmt {
  const { i18n: inst } = useTranslation()
  const lng = inst.language
  return useMemo(() => {
    const locale = localeFor(lng)
    return {
      ...fmt,
      number: (n: Numeric, o: NumberOpts = {}) => number(n, { locale, ...o }),
      exact: (n: Numeric, u?: string | null, o: Omit<NumberOpts, 'maxFraction'> = {}) => exact(n, u, { locale, ...o }),
      compact: (n: Numeric, o: { maxFraction?: number; locale?: string } = {}) => compact(n, { locale, ...o }),
      percent: (n: Numeric, o: { precision?: number; ratio?: boolean; signed?: boolean; locale?: string } = {}) => percent(n, { locale, ...o }),
      value: (n: Numeric, u?: string | null, o: NumberOpts & { compact?: boolean } = {}) => value(n, u, { locale, ...o }),
      delta: (n: Numeric, o: { percent?: boolean; precision?: number; locale?: string } = {}) => delta(n, { locale, ...o }),
      date: (d: Date | string | number | null | undefined, o: DateOpts = {}) => date(d, { locale, ...o }),
      dateTime: (d: Date | string | number | null | undefined, o: Omit<DateOpts, 'style'> & { seconds?: boolean } = {}) => dateTime(d, { locale, ...o }),
      relative: (d: Date | string | number | null | undefined, o: { now?: number; locale?: string } = {}) => relative(d, { locale, ...o }),
      localeFor: () => locale,
    } as Fmt
  }, [lng])
}

export default fmt
