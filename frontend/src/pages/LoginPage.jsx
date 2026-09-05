import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { LanguageToggle } from '../components/LanguageToggle.jsx';
import { GoogleSignIn } from '../components/GoogleSignIn.jsx';
import { referenceService } from '../services/api/farmerService.js';

// Demo accounts still work through the classic password form.
const DEMO = [
  { labelKey: 'auth.demoFarmer', phone: '9999999001', password: 'Farmer@123' },
  { labelKey: 'auth.demoOfficer', phone: '9999999101', password: 'Officer@123' },
  { labelKey: 'auth.demoAuthority', phone: '9999999201', password: 'Authority@123' },
];

const ROLES = [
  { id: 'farmer', labelKey: 'auth.tabFarmer', icon: 'wheat' },
  { id: 'officer', labelKey: 'auth.tabOfficer', icon: 'clipboard' },
  { id: 'authority', labelKey: 'auth.tabAuthority', icon: 'flag' },
];

// Keeps only digits; tolerates +91 / 91 / 0 prefixes typed by the user.
function digitsOf(value) {
  let s = String(value || '').replace(/\D/g, '');
  if (s.length === 12 && s.startsWith('91')) s = s.slice(2);
  else if (s.length === 11 && s.startsWith('0')) s = s.slice(1);
  return s.slice(0, 10);
}

export default function LoginPage() {
  const { t, lang } = useI18n();
  const { login, loginWithPhone, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('farmer'); // farmer | officer | authority
  const [step, setStep] = useState('quick'); // quick | profile (new phone number)
  const [pwOpen, setPwOpen] = useState(false); // classic password fallback

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [villages, setVillages] = useState([]);
  const [villageId, setVillageId] = useState('');

  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    referenceService.villages().then((d) => setVillages(d.villages)).catch(() => {});
  }, []);

  function finish(user) {
    navigate(homeFor(user.role), { replace: true });
  }

  function mapError(err) {
    if (err?.code === 'NETWORK_ERROR') return { message: t('common.errorNetwork') };
    if (err?.code === 'AUTH_NO_PASSWORD') return { message: t('auth.quickOnly') };
    if (err?.code === 'AUTH_INVALID_CREDENTIALS') return { message: t('auth.invalidLogin') };
    return err;
  }

  // ---- Farmer: passwordless mobile login -------------------------------------
  async function onPhoneSubmit(e) {
    e.preventDefault();
    setError(null);
    const digits = digitsOf(phone);
    if (digits.length !== 10) {
      setError({ message: t('auth.phonePlaceholder') });
      return;
    }
    setBusy(true);
    try {
      const user = await loginWithPhone(digits);
      finish(user);
    } catch (err) {
      if (err?.code === 'AUTH_PROFILE_REQUIRED') {
        // Brand-new number → one-time name + village step creates the account.
        setStep('profile');
      } else {
        setError(mapError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onProfileSubmit(e) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError({ message: t('auth.name') });
      return;
    }
    if (!villageId) {
      setError({ message: t('auth.chooseVillage') });
      return;
    }
    setBusy(true);
    try {
      const user = await loginWithPhone(digitsOf(phone), {
        name: name.trim(),
        villageId,
        preferredLanguage: lang,
      });
      finish(user);
    } catch (err) {
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  // ---- Officer / authority: Google sign-in -----------------------------------
  async function onGoogleSuccess(payload) {
    setError(null);
    setBusy(true);
    try {
      const user = await loginWithGoogle(payload);
      finish(user);
    } catch (err) {
      setError(mapError(err));
      throw err;
    } finally {
      setBusy(false);
    }
  }

  // ---- Classic password fallback (demo accounts) ------------------------------
  async function onPasswordSubmit(e) {
    e.preventDefault();
    setError(null);
    if (digitsOf(phone).length !== 10) {
      setError({ message: t('auth.phonePlaceholder') });
      return;
    }
    if (!password) {
      setError({ message: t('auth.password') });
      return;
    }
    setBusy(true);
    try {
      const user = await login(digitsOf(phone), password);
      finish(user);
    } catch (err) {
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  async function useDemoAccount(d) {
    setError(null);
    setBusy(true);
    try {
      const user = await login(d.phone, d.password);
      finish(user);
    } catch (err) {
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  function switchRole(nextRole) {
    setRole(nextRole);
    setStep('quick');
    setPwOpen(false);
    setError(null);
  }

  const hintKey = role === 'farmer' ? 'auth.farmerTabHint' : role === 'officer' ? 'auth.officerTabHint' : 'auth.authorityTabHint';
  const showPasswordForm = pwOpen && role === 'farmer';

  return (
    <div className="auth-layout">
      <div className="auth-wrap">
        <div className="auth-topbar">
          <LanguageToggle />
        </div>

        <div className="auth-card">
          <div className="logo">
            <span className="auth-logo-mark" aria-hidden="true"><Icon name="wheat" size={30} strokeWidth={2} /></span>
            <div className="hi">अन्नदाता कनेक्ट</div>
            <div className="tag">{t('app.tagline')}</div>
          </div>

          {/* Role toggle: farmer / officer / authority */}
          <div className="role-toggle" role="tablist" aria-label={t('auth.loginAs')}>
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={role === r.id}
                className={`role-toggle-btn${role === r.id ? ' active' : ''}`}
                onClick={() => switchRole(r.id)}
              >
                <Icon name={r.icon} size={17} />
                <span>{t(r.labelKey)}</span>
              </button>
            ))}
          </div>

          <p className="auth-role-hint">{t(hintKey)}</p>

          {error && <div className="form-banner error">{error.message}</div>}

          {role === 'farmer' && !showPasswordForm && step === 'quick' && (
            <form onSubmit={onPhoneSubmit} noValidate>
              <div className="field">
                <label htmlFor="phone">{t('auth.phone')}</label>
                <div className="phone-field">
                  <span className="phone-prefix" aria-hidden="true">+91</span>
                  <input
                    id="phone"
                    className="input phone-input"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={13}
                    placeholder={t('auth.phonePlaceholder')}
                    value={phone}
                    onChange={(e) => setPhone(digitsOf(e.target.value))}
                    autoFocus
                  />
                </div>
                <div className="hint">{t('auth.farmerTabHint')}</div>
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? t('auth.checkingPhone') : t('auth.phoneContinue')}
              </button>
              <button type="button" className="auth-alt-link" onClick={() => setPwOpen(true)}>
                <Icon name="key" size={14} /> {t('auth.usePassword')}
              </button>
            </form>
          )}

          {role === 'farmer' && !showPasswordForm && step === 'profile' && (
            <form onSubmit={onProfileSubmit} noValidate>
              <div className="auth-new-badge">
                <Icon name="phone" size={15} />
                <span>+91 {digitsOf(phone)}</span>
                <button type="button" onClick={() => { setStep('quick'); setError(null); }}>
                  {t('auth.changeNumber')}
                </button>
              </div>
              <h2 className="auth-step-title">{t('auth.newFarmerTitle')}</h2>
              <p className="auth-step-sub">{t('auth.newFarmerHint')}</p>
              <div className="field">
                <label htmlFor="pname">{t('auth.name')}</label>
                <input id="pname" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label htmlFor="village">{t('auth.village')}</label>
                <select id="village" className="select" value={villageId} onChange={(e) => setVillageId(e.target.value)}>
                  <option value="">{t('auth.chooseVillage')}</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {lang === 'hi' ? v.nameHi : v.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? t('auth.creatingAccount') : t('auth.createAccount')}
              </button>
            </form>
          )}

          {role !== 'farmer' && !showPasswordForm && (
            <div className="auth-google-zone">
              <GoogleSignIn
                role={role}
                disabled={busy}
                onSuccess={onGoogleSuccess}
                onError={(err) => setError(mapError(err))}
              />
              <button type="button" className="auth-alt-link" onClick={() => setPwOpen(true)}>
                <Icon name="key" size={14} /> {t('auth.usePassword')}
              </button>
            </div>
          )}

          {showPasswordForm && (
            <form onSubmit={onPasswordSubmit} noValidate>
              <h2 className="auth-step-title">{t('auth.password')}</h2>
              <div className="field">
                <label htmlFor="phone">{t('auth.phone')}</label>
                <input
                  id="phone"
                  className="input"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={13}
                  placeholder={t('auth.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(digitsOf(e.target.value))}
                />
              </div>
              <div className="field">
                <label htmlFor="password">{t('auth.password')}</label>
                <div className="pw-field">
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
              <button type="button" className="auth-alt-link" onClick={() => { setPwOpen(false); setError(null); }}>
                <Icon name="arrowUp" size={14} /> {t('auth.useQuickLogin')}
              </button>
            </form>
          )}

          <div className="demo-box">
            <strong>{t('auth.demoTitle')}</strong>
            <table>
              <tbody>
                {DEMO.map((d) => (
                  <tr key={d.phone}>
                    <td>{t(d.labelKey)}</td>
                    <td>
                      {d.phone} / {d.password}
                      <button className="btn btn-outline btn-sm" type="button" disabled={busy} onClick={() => useDemoAccount(d)}>
                        <Icon name="key" size={14} /> {t('auth.useDemo')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="auth-register-line">
            {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
