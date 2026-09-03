import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { translations } from './translations.js';

const I18nContext = createContext(null);
const LANG_KEY = 'ks-lang';

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'en');

  const changeLang = useCallback((l) => {
    setLang(l);
    localStorage.setItem(LANG_KEY, l);
    document.documentElement.lang = l === 'hi' ? 'hi' : 'en';
  }, []);

  const value = useMemo(() => {
    const t = (path, vars) => {
      let out = get(translations[lang], path) ?? get(translations.en, path) ?? path;
      if (vars && typeof out === 'string') {
        for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v));
      }
      return out;
    };
    // Pick a bilingual API field (nameEn/nameHi, messageEn/messageHi) per active language.
    const pick = (obj, base) => {
      if (!obj) return '';
      return obj[`${base}${lang === 'hi' ? 'Hi' : 'En'}`] ?? obj[`${base}En`] ?? '';
    };
    return { lang, setLang: changeLang, t, pick };
  }, [lang, changeLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
