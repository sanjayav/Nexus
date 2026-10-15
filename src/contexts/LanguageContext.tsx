import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { LOCALES, Locale } from '../i18n'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const STORAGE_KEY = 'aeiforo_language'

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function readStoredLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    // Older builds stored display labels ('EN', '简体中文').
    if (saved === 'zh' || saved === '简体中文') return 'zh'
    if (saved === 'en' || saved === 'EN') return 'en'
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable */
    }
  }

  useEffect(() => {
    document.documentElement.lang = LOCALES.find(l => l.code === locale)!.htmlLang
  }, [locale])

  return <LanguageContext.Provider value={{ locale, setLocale }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
