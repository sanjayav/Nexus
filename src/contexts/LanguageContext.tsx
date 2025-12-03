import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  direction: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('aeiforo_language');
    return (saved as Language) || 'EN';
  });

  const direction = language === 'عربي' ? 'rtl' : 'ltr';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('aeiforo_language', lang);
    document.documentElement.dir = lang === 'عربي' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang === 'EN' ? 'en' : lang === '简体中文' ? 'zh' : 'ar';
  };

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language === 'EN' ? 'en' : language === '简体中文' ? 'zh' : 'ar';
  }, [language, direction]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, direction }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

