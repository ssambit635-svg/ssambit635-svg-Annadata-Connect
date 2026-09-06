import { useI18n } from '../i18n/I18nContext.jsx';

// Three-way language switch: English · हिंदी · ଓଡ଼ିଆ.
// `className` lets callers reuse the landing (.home-language) or portal (.lang-toggle) skin.
export function LanguageToggle({ className = 'lang-toggle' }) {
  const { lang, setLang, t, languages } = useI18n();
  return (
    <div className={className} role="group" aria-label={t('landing.languageLabel')}>
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          className={lang === l.code ? 'active' : ''}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          title={l.native}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
