import { useState } from 'react';
import { Globe } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../i18n/translations';

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'EN', label: 'English', flag: '🇬🇧' },
    { code: '简体中文', label: '简体中文', flag: '🇨🇳' },
    { code: 'عربي', label: 'عربي', flag: '🇦🇪' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-dark-surface transition-colors"
      >
        <Globe className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-300">{language}</span>
      </button>
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-dark-surface border border-dark-border rounded-xl shadow-xl z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setShowMenu(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-dark-bg transition-colors first:rounded-t-xl last:rounded-b-xl',
                  language === lang.code ? 'text-accent bg-accent/10' : 'text-gray-300'
                )}
              >
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

