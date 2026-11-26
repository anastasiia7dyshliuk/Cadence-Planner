import { createContext, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS } from '../i18n/translations.js';

const LanguageContext = createContext(null);
const LANG_STORAGE_KEY = 'cadence_language_preference';

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'uk' || saved === 'en') return saved;
    } catch {
      // Безпечно ігноруємо
    }
    return 'uk';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Безпечно ігноруємо
    }
  }, [lang]);

  const toggleLang = () => {
    setLang((prev) => (prev === 'uk' ? 'en' : 'uk'));
  };

  const t = TRANSLATIONS[lang] || TRANSLATIONS.uk;

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage має використовуватися всередині LanguageProvider');
  }
  return ctx;
}
