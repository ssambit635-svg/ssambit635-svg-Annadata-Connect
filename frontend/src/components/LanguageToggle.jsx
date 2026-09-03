import { useI18n } from '../i18n/I18nContext.jsx';

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>
        EN
      </button>
      <button className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')} aria-pressed={lang === 'hi'}>
        हिन्दी
      </button>
    </div>
  );
}
