import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import translations from '../i18n/translations.js';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'nt-language';

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage unavailable (private browsing, etc.) — language just
      // won't persist across reloads, which is a harmless degradation.
    }
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  }, [lang]);

  const t = useCallback(
    (key, fallback) => translations[lang]?.[key] ?? translations.en[key] ?? fallback ?? key,
    [lang]
  );

  const toggleLang = useCallback(() => {
    setLang((l) => (l === 'en' ? 'bn' : 'en'));
  }, []);

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, toggleLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
