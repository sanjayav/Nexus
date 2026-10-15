import { useMemo } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * i18n core.
 *
 * Each screen owns a small dictionary file in `src/i18n/pages/` shaped as
 * `{ en: {...}, zh: {...} }`. `en` is the source of truth (and the type);
 * other locales may be partial and fall back to English key-by-key.
 *
 *   const s = useStrings(executiveStrings)
 *   <h1>{s.title}</h1>
 *   <p>{fmt(s.gapsLeft, { count: 4 })}</p>
 */

export type Locale = 'en' | 'zh'

export const LOCALES: { code: Locale; label: string; short: string; htmlLang: string; intl: string }[] = [
  { code: 'en', label: 'English', short: 'EN', htmlLang: 'en', intl: 'en-GB' },
  { code: 'zh', label: '简体中文', short: '中文', htmlLang: 'zh-CN', intl: 'zh-CN' },
]

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> }
// Widen literal string leaves so `en` can be declared `as const`-free and still type `zh`.
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : T[K] extends readonly (infer U)[] ? Widen<U>[] : Widen<T[K]> }

export type Dict<T> = { en: T } & { [L in Exclude<Locale, 'en'>]?: DeepPartial<Widen<T>> }

export function defineStrings<T extends object>(dict: { en: T } & { [L in Exclude<Locale, 'en'>]?: DeepPartial<Widen<T>> }): Dict<Widen<T>> {
  return dict as Dict<Widen<T>>
}

function merge<T>(base: T, over: unknown): T {
  if (over == null) return base
  if (typeof base !== 'object' || base === null) return (typeof over === typeof base ? over : base) as T
  if (Array.isArray(base)) {
    const o = Array.isArray(over) ? over : []
    return base.map((b, i) => merge(b, o[i])) as T
  }
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(base as object)) {
    out[k] = merge((base as Record<string, unknown>)[k], (over as Record<string, unknown>)[k])
  }
  return out as T
}

export function resolveStrings<T>(dict: Dict<T>, locale: Locale): T {
  return locale === 'en' ? dict.en : merge(dict.en, dict[locale])
}

export function useStrings<T>(dict: Dict<T>): T {
  const { locale } = useLanguage()
  return useMemo(() => resolveStrings(dict, locale), [dict, locale])
}

/** Interpolate `{name}` placeholders. */
export function fmt(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m))
}

/** Locale-aware number / date / percent formatting. */
export function useFormat() {
  const { locale } = useLanguage()
  return useMemo(() => {
    const intl = LOCALES.find(l => l.code === locale)!.intl
    return {
      number: (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(intl, opts).format(n),
      compact: (n: number) => new Intl.NumberFormat(intl, { notation: 'compact', maximumFractionDigits: 1 }).format(n),
      percent: (n: number, digits = 0) => new Intl.NumberFormat(intl, { style: 'percent', maximumFractionDigits: digits }).format(n / 100),
      date: (d: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) => new Intl.DateTimeFormat(intl, opts).format(typeof d === 'string' ? new Date(d) : d),
    }
  }, [locale])
}
