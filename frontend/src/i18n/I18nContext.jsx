import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { translations } from './translations.js';

const I18nContext = createContext(null);
const LANG_KEY = 'ks-lang';

// Supported UI languages. Odisha pilot → Odia is first-class next to English and Hindi.
export const LANGUAGES = [
  { code: 'en', label: 'EN', native: 'English', locale: 'en-IN', field: 'En' },
  { code: 'hi', label: 'हिंदी', native: 'हिन्दी', locale: 'hi-IN', field: 'Hi' },
  { code: 'or', label: 'ଓଡ଼ିଆ', native: 'ଓଡ଼ିଆ', locale: 'or-IN', field: 'Or' },
];
const CODES = LANGUAGES.map((l) => l.code);

export function normalizeLang(l) {
  return CODES.includes(l) ? l : 'en';
}

export function localeFor(lang) {
  return LANGUAGES.find((l) => l.code === lang)?.locale || 'en-IN';
}

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

// Pick a bilingual/trilingual API field (nameEn/nameHi/nameOr, messageEn/messageHi…)
// per active language. Odia falls back to English (not Hindi) when a record has
// no Odia value, because most farmers in the pilot read Odia or English.
export function pickField(obj, base, lang) {
  if (!obj) return '';
  if (lang === 'hi') return obj[`${base}Hi`] ?? obj[`${base}En`] ?? '';
  if (lang === 'or') return obj[`${base}Or`] ?? obj[`${base}En`] ?? obj[`${base}Hi`] ?? '';
  return obj[`${base}En`] ?? '';
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => normalizeLang(localStorage.getItem(LANG_KEY)));

  const changeLang = useCallback((l) => {
    const next = normalizeLang(l);
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const t = (path, vars) => {
      let out = get(translations[lang], path) ?? get(translations.en, path) ?? path;
      if (vars && typeof out === 'string') {
        for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v));
      }
      return out;
    };
    const pick = (obj, base) => pickField(obj, base, lang);
    return { lang, setLang: changeLang, t, pick, locale: localeFor(lang), languages: LANGUAGES };
  }, [lang, changeLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
