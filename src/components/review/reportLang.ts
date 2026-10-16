import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getFramework } from '../../lib/frameworks'

/**
 * Report language helpers shared by the publish, verify and public-report
 * screens. A report is rendered once, in one language ('en' | 'zh'); the
 * server stores it on report_artifacts.locale.
 */
export type ReportLang = 'en' | 'zh'

export const REPORT_LANGS: ReportLang[] = ['en', 'zh']

/** Normalise any language tag ('zh-CN', 'zh', 'en-GB') to a report language. */
export function toReportLang(tag: string | null | undefined): ReportLang | null {
  if (!tag) return null
  const t = String(tag).trim().toLowerCase()
  if (t.startsWith('zh')) return 'zh'
  if (t.startsWith('en')) return 'en'
  return null
}

/** BCP-47 tag sent to the API / used for `lang` attributes. */
export function reportLangTag(l: ReportLang): string {
  return l === 'zh' ? 'zh-CN' : 'en'
}

/**
 * Framework display name from the catalog (never an upper-cased id).
 * `cn-sse` → "SSE Sustainability Reporting Guidelines" / its Chinese name.
 */
export function frameworkName(id: string | null | undefined, lang: string | null | undefined): string {
  if (!id) return '—'
  const fw = getFramework(id)
  if (!fw) return id
  return toReportLang(lang) === 'zh' ? fw.nameZh ?? fw.name : fw.name
}

/** Short chip code from the catalog ('GRI', 'CSRD E1'); falls back to the id. */
export function frameworkCode(id: string | null | undefined): string {
  if (!id) return '—'
  return getFramework(id)?.code ?? id
}

const LNG_KEY = 'aeiforo_lng'

/**
 * Language for a public page (verify / shared report). It follows, in order:
 *   1. `?lang=` in the URL (so a shared link keeps its language),
 *   2. the report's own locale,
 *   3. the visitor's current UI language.
 *
 * Switching here does NOT overwrite the visitor's saved app language — the
 * stored preference is put back after each switch, and the previous language
 * is restored when the page unmounts (in-app navigation).
 */
export function usePublicLanguage(reportLocale?: string | null) {
  const { i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const previous = useRef(i18n.language)
  const touched = useRef(false)
  const [, force] = useState(0)

  const apply = useCallback(
    (l: ReportLang) => {
      if (toReportLang(i18n.language) === l) return
      let stored: string | null = null
      try { stored = localStorage.getItem(LNG_KEY) } catch { /* private mode */ }
      touched.current = true
      void i18n.changeLanguage(l).then(() => {
        try {
          if (stored == null) localStorage.removeItem(LNG_KEY)
          else localStorage.setItem(LNG_KEY, stored)
        } catch { /* ignore */ }
        force((n) => n + 1)
      })
    },
    [i18n],
  )

  useEffect(() => {
    const target = toReportLang(params.get('lang')) ?? toReportLang(reportLocale)
    if (target) apply(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportLocale])

  useEffect(() => {
    const prev = previous.current
    return () => {
      if (touched.current && prev && toReportLang(prev) !== toReportLang(i18n.language)) {
        void i18n.changeLanguage(prev)
      }
    }
  }, [i18n])

  const setLang = useCallback(
    (l: ReportLang) => {
      apply(l)
      const next = new URLSearchParams(params)
      next.set('lang', l)
      setParams(next, { replace: true })
    },
    [apply, params, setParams],
  )

  return {
    lang: (toReportLang(i18n.language) ?? 'en') as ReportLang,
    reportLang: toReportLang(reportLocale),
    setLang,
  }
}
