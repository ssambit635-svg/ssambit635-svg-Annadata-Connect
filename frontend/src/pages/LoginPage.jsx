import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { LanguageToggle } from '../components/LanguageToggle.jsx';

const DEMO = [
  { labelKey: 'auth.demoFarmer', phone: '9999999001', password: 'Farmer@123' },
  { labelKey: 'auth.demoOfficer', phone: '9999999101', password: 'Officer@123' },
  { labelKey: 'auth.demoAuthority', phone: '9999999201', password: 'Authority@123' },
];

export default function LoginPage() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError({ message: t('auth.phonePlaceholder') });
      return;
    }
    if (!password) {
      setError({ message: t('auth.password') });
      return;
    }
    setBusy(true);
    try {
      const user = await login(phone.trim(), password);
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      setError(
        err?.code === 'AUTH_INVALID_CREDENTIALS'
          ? { message: t('auth.invalidLogin') }
          : err?.code === 'NETWORK_ERROR'
            ? { message: t('common.errorNetwork') }
            : err
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div className="auth-topbar">
          <LanguageToggle />
        </div>
        <div className="auth-card">
          <div className="logo">
            <div className="hi">अन्नदाता कनेक्ट</div>
            <div className="tag">{t('app.tagline')}</div>
          </div>
          <h1 style={{ textAlign: 'center', fontSize: '1.15rem' }}>{t('auth.loginTitle')}</h1>
          {error && <div className="form-banner error">{error.message}</div>}
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="phone">{t('auth.phone')}</label>
              <input
                id="phone"
                className="input"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder={t('auth.phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="field">
              <label htmlFor="password">{t('auth.password')}</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  id="password"
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowPw((s) => !s)} aria-label="toggle password visibility">
                  <Icon name={showPw ? 'eyeOff' : 'eye'} size={17} />
                </button>
              </div>
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </form>
          <p style={{ textAlign: 'center', margin: '1rem 0 0' }}>
            {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
          </p>
          <div className="demo-box">
            <strong>{t('auth.demoTitle')}</strong>
            <table>
              <tbody>
                {DEMO.map((d) => (
                  <tr key={d.phone}>
                    <td>{t(d.labelKey)}</td>
                    <td>
                      {d.phone} / {d.password}
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => {
                          setPhone(d.phone);
                          setPassword(d.password);
                        }}
                      >
                        <Icon name="key" size={14} /> {t('auth.useDemo')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
