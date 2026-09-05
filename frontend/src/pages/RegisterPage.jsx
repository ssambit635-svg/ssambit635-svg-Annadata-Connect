import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { referenceService } from '../services/api/farmerService.js';
import { LanguageToggle } from '../components/LanguageToggle.jsx';
import Icon from '../components/Icon.jsx';

export default function RegisterPage() {
  const { t, pick, lang } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [villages, setVillages] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', password: '', villageId: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    referenceService.villages().then((d) => setVillages(d.villages)).catch(() => {});
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) return setError({ message: t('auth.name') });
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) return setError({ message: t('auth.phonePlaceholder') });
    if (form.password.length < 8) return setError({ message: t('auth.passwordHint') });
    if (!form.villageId) return setError({ message: t('auth.chooseVillage') });
    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        villageId: form.villageId,
        preferredLanguage: lang,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.code === 'NETWORK_ERROR' ? { message: t('common.errorNetwork') } : err);
    } finally {
      setBusy(false);
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="auth-layout">
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div className="auth-topbar">
          <LanguageToggle />
        </div>
        <div className="auth-card">
          <div className="logo">
            <span className="auth-logo-mark" aria-hidden="true"><Icon name="wheat" size={30} strokeWidth={2} /></span>
            <div className="hi">अन्नदाता कनेक्ट</div>
            <div className="tag">{t('app.tagline')}</div>
          </div>
          <h1 style={{ textAlign: 'center', fontSize: '1.15rem' }}>{t('auth.registerTitle')}</h1>
          {error && <div className="form-banner error">{error.message}</div>}
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="name">{t('auth.name')}</label>
              <input id="name" className="input" autoComplete="name" value={form.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label htmlFor="rphone">{t('auth.phone')}</label>
              <input
                id="rphone"
                className="input"
                inputMode="numeric"
                maxLength={10}
                placeholder={t('auth.phonePlaceholder')}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
              />
            </div>
            <div className="field">
              <label htmlFor="village">{t('auth.village')}</label>
              <select id="village" className="select" value={form.villageId} onChange={set('villageId')}>
                <option value="">{t('auth.chooseVillage')}</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {pick(v, 'name')}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="rpassword">{t('auth.password')}</label>
              <input id="rpassword" className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
              <div className="hint">{t('auth.passwordHint')}</div>
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? t('auth.registering') : t('auth.register')}
            </button>
          </form>
          <p style={{ textAlign: 'center', margin: '1rem 0 0' }}>
            {t('auth.haveAccount')} <Link to="/login">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
