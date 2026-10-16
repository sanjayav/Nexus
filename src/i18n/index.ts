import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './en.json'
import th from './th.json'
import zh from './zh.json'

/**
 * Per-area dictionaries live in `locales/<lang>/<area>.json` and are merged
 * under the top-level key `<area>` (e.g. `locales/zh/mytasks.json` →
 * `t('mytasks.title')`). Splitting by area keeps translation work for
 * different parts of the app in separate files.
 */
const areaFiles = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*/*.json', { eager: true })

function withAreas(lang: string, base: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...base }
  for (const [path, mod] of Object.entries(areaFiles)) {
    const m = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path)
    if (m && m[1] === lang) out[m[2]] = mod.default
  }
  return out
}

/**
 * i18n scaffolding. en is the source of truth — every key MUST exist in en.
 * th is best-effort polite Thai with English fallbacks for jargon where a
 * confirmed Thai term wasn't available (see docs/I18N.md and th.notes.json).
 *
 * Adding a new locale: create `src/i18n/<code>.json` mirroring en's keys,
 * import + register here, add to the language switcher in TopBar.
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: withAreas('en', en) },
      th: { translation: withAreas('th', th) },
      zh: { translation: withAreas('zh', zh) },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'th', 'zh'],
    // 'zh-CN' / 'zh-Hans' browsers resolve to 'zh'.
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      // Persist the user's choice so it survives reloads.
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'aeiforo_lng',
      caches: ['localStorage'],
    },
  })

// Keep <html lang> in sync so the CJK font stack and line-height rules apply.
const htmlLang = (lng: string) => (lng.startsWith('zh') ? 'zh-CN' : lng.startsWith('th') ? 'th' : 'en')
document.documentElement.lang = htmlLang(i18n.language ?? 'en')
i18n.on('languageChanged', lng => {
  document.documentElement.lang = htmlLang(lng)
})

export default i18n
