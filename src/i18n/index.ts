import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './en.json'
import th from './th.json'

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
      en: { translation: en },
      th: { translation: th },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'th'],
    interpolation: { escapeValue: false },
    detection: {
      // Persist the user's choice so it survives reloads.
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'aeiforo_lng',
      caches: ['localStorage'],
    },
  })

export default i18n
