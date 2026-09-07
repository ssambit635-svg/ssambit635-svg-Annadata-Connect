// Welcome / sign-in — the first screen of Annadata Connect.
// Full auth parity with the website (OTP, password, mock Google, demo
// accounts, farmer registration) wrapped in the app's own design.
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../auth/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useAuthOptions } from '../../hooks/useAuthOptions.js';
import { OtpVerification } from '../../components/OtpVerification.jsx';
import { GoogleG } from '../../components/GoogleSignIn.jsx';
import { authErrorMessage, normalizeMobileInput } from '../../utils/auth.js';
import { referenceService } from '../../services/api/farmerService.js';
import Icon from '../../components/Icon.jsx';
import { BrandLogo } from '../../components/BrandLogo.jsx';
import { MBtn, MCard, MField, MInput, MSelect, Sheet, MLangPills, MLoader } from '../ui.jsx';

const ROLES = [
  { id: 'farmer', icon: 'wheat', sub: 'saathi.roleFarmerSub' },
  { id: 'officer', icon: 'clipboard', sub: 'saathi.roleOfficerSub' },
  { id: 'authority', icon: 'flag', sub: 'saathi.roleAuthoritySub' },
];
const METHODS = [
  { id: 'sms', icon: 'phone' },
  { id: 'email', icon: 'mail' },
  { id: 'password', icon: 'key' },
];
const DEMO = [
  { role: 'farmer', name: 'Bijay Pradhan', phone: '9999999001', password: 'Farmer@123', district: 'Khordha' },
  { role: 'farmer', name: 'Kuni Sahoo', phone: '9999999002', password: 'Farmer@123', district: 'Khordha' },
  { role: 'farmer', name: 'Ramesh Patra', phone: '9999999003', password: 'Farmer@123', district: 'Khordha' },
  { role: 'farmer', name: 'Pramila Swain', phone: '9999999009', password: 'Farmer@123', district: 'Khordha' },
  { role: 'farmer', name: 'Debendra Biswal', phone: '9999999021', password: 'Farmer@123', district: 'Cuttack' },
  { role: 'farmer', name: 'Rashmita Behera', phone: '9999999025', password: 'Farmer@123', district: 'Puri' },
  { role: 'officer', name: 'Rashmi Das', phone: '9999999101', password: 'Officer@123', district: 'Khordha' },
  { role: 'authority', name: 'Suresh Patnaik', phone: '9999999201', password: 'Authority@123', district: 'Khordha' },
  { role: 'authority', name: 'Anita Meher', phone: '9999999202', password: 'Authority@123', district: 'Odisha' },
];
const GOOGLE_SWITCH_KEY = 'ks-mock-google';

export default function Welcome({ registration = false }) {
  const { t, pick, lang } = useI18n();
  const { user, isAuthenticated, initializing, login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  const { options, error: optionsError, retry } = useAuthOptions();

  const [role, setRole] = useState('farmer');
  const [method, setMethod] = useState('sms');
  const [profileTicket, setProfileTicket] = useState(null);
  const [villages, setVillages] = useState([]);
  const [villagesError, setVillagesError] = useState(false);
  const [profile, setProfile] = useState({ name: '', villageId: '', password: '' });
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [villageAttempt, setVillageAttempt] = useState(0);

  useEffect(() => {
    if (!profileTicket) return undefined;
    let active = true;
    setVillagesError(false);
    referenceService.villages().then((data) => { if (active) setVillages(data.villages); })
      .catch(() => { if (active) setVillagesError(true); });
    return () => { active = false; };
  }, [profileTicket, villageAttempt]);

  if (initializing) return <MLoader />;
  if (isAuthenticated && user) return <Navigate to={homeFor(user.role)} replace />;

  function finish(data) {
    setError(null);
    if (data.registrationRequired) {
      setProfileTicket(data);
      setProfile({ name: data.profile.name || '', villageId: '', password: '' });
    } else if (data.user && data.token) {
      navigate(homeFor(data.user.role), { replace: true });
    }
  }
  async function passwordSignIn(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try { finish(await login(identifier.trim(), password, role)); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  }
  async function googleSignIn(account) {
    setGoogleOpen(false);
    setBusy(true);
    setError(null);
    try { finish(await loginWithGoogle({ role, email: account.email })); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  }
  async function completeProfile(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      finish(await register({ ...profile, name: profile.name.trim(), registrationToken: profileTicket.registrationToken, preferredLanguage: lang }));
    } catch (err) { setError(err); }
    finally { setBusy(false); }
  }
  async function demoSignIn(account) {
    setDemoOpen(false);
    setBusy(true);
    setError(null);
    try { finish(await login(account.phone, account.password, account.role)); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  }

  const googleAccounts = (options?.google?.accounts || []).filter((a) => a.role === role);
  const googleOn = (() => { try { return localStorage.getItem(GOOGLE_SWITCH_KEY) !== 'off'; } catch { return true; } })();
  const googleAvailable = Boolean(options?.google?.enabled) && googleOn && googleAccounts.length > 0;

  return (
    <div className="m-welcome">
      {/* preview banner (browser preview only — never inside the APK) */}
      {typeof window !== 'undefined' && !window.Capacitor?.isNativePlatform?.() && (
        <div className="m-preview-banner" style={{ margin: '0 -18px' }}>{t('saathi.previewBanner')}</div>
      )}

      {/* ── hero ── */}
      <div className="m-welcome-hero">
        <div className="m-welcome-arcs" aria-hidden="true" />
        <div style={{ marginBottom: 14, position: 'relative' }}>
          <MLangPills />
        </div>
        <span className="m-gov-line">
          {t('saathi.govChip')} <i className="m-gov-dot" aria-hidden="true" />
        </span>
        <h1 className="m-welcome-title">
          <span>{t('saathi.brandFirst')}</span> <span className="m-gold">{t('saathi.brandSecond')}</span>
        </h1>
        <p className="m-welcome-tag">{t('saathi.tagline')}</p>
        <div className="m-welcome-badge">
          <BrandLogo size={92} title={t('saathi.name')} />
        </div>
      </div>

      {/* ── profile completion after first OTP/Google sign-in ── */}
      {profileTicket ? (
        <MCard>
          <div className="m-card-h"><Icon name="checkCircle" size={19} /> {t('auth.profileStep')}</div>
          <h2 style={{ fontSize: 21, marginBottom: 2 }}>{t('auth.newFarmerTitle')}</h2>
          <p style={{ color: 'var(--m-ink-soft)', fontSize: 14.5, marginBottom: 14 }}>{t('auth.newFarmerHint')}</p>
          <div className="m-banner success" style={{ marginBottom: 14 }}>
            <Icon name="checkCircle" size={17} />
            <span>{profileTicket.profile.phone ? `+91 ${profileTicket.profile.phone}` : profileTicket.profile.email} — {t('auth.contactVerified')}</span>
          </div>
          {error && <div className="m-banner error" role="alert" style={{ marginBottom: 14 }}><Icon name="alertTriangle" size={17} />{authErrorMessage(error, t)}</div>}
          <form onSubmit={completeProfile}>
            <MField label={t('auth.name')} htmlFor="saathi-name">
              <MInput id="saathi-name" autoComplete="name" minLength={2} maxLength={100} required autoFocus value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} disabled={busy} />
            </MField>
            <MField label={t('auth.village')} htmlFor="saathi-village">
              <MSelect id="saathi-village" required value={profile.villageId} onChange={(e) => setProfile({ ...profile, villageId: e.target.value })} disabled={busy || !villages.length}>
                <option value="">{t('auth.chooseVillage')}</option>
                {villages.map((v) => <option key={v.id} value={v.id}>{pick(v, 'name')}</option>)}
              </MSelect>
              {villagesError && <div className="m-hint" style={{ color: 'var(--m-red)' }}>{t('common.errorNetwork')} <button type="button" className="text-button" onClick={() => setVillageAttempt((n) => n + 1)}>{t('common.retry')}</button></div>}
            </MField>
            <MField label={t('auth.optionalPassword')} hint={t('auth.optionalPasswordHint')} htmlFor="saathi-pw">
              <MInput id="saathi-pw" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} disabled={busy} />
            </MField>
            <MBtn block type="submit" disabled={busy || !villages.length}>
              {busy ? t('auth.creatingAccount') : t('auth.createAccount')}
            </MBtn>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button type="button" className="text-button" onClick={() => { setProfileTicket(null); setError(null); }}>{t('auth.startAgain')}</button>
            </div>
          </form>
        </MCard>
      ) : (
        <>
          {/* ── role picker ── */}
          <MCard plain className="m-stagger m-signin-card">
            <div className="m-card-h m-card-h-split">
              <span><Icon name="users" size={18} /> {t('auth.loginAs')}</span>
              <span className="m-step-chip">{t('saathi.stepOf', { n: 1, total: 2 })}</span>
            </div>
            <div className="m-role-grid" role="group" aria-label={t('auth.loginAs')}>
              {ROLES.filter((r) => !registration || r.id === 'farmer').map((r) => (
                <button key={r.id} type="button" className={`m-role ${role === r.id ? 'active' : ''}`} onClick={() => { setRole(r.id); setError(null); setPassword(''); }}>
                  <span className="m-role-ico"><Icon name={r.icon} size={22} /></span>
                  <span className="m-role-name">{t(`common.${r.id}`)}</span>
                  <span className="m-role-sub">{t(r.sub)}</span>
                </button>
              ))}
            </div>
            <p className="m-role-hint">
              <Icon name="info" size={15} />
              <span>{t(role === 'farmer' ? 'auth.farmerTabHint' : 'auth.staffTabHint')}</span>
            </p>
          </MCard>

          {error && <div className="m-banner error" role="alert"><Icon name="alertTriangle" size={17} />{authErrorMessage(error, t)}</div>}
          {optionsError && (
            <div className="m-banner warning" role="alert">
              <Icon name="wifiOff" size={17} />
              <span style={{ flex: 1 }}>{authErrorMessage(optionsError, t)}</span>
              <button type="button" className="text-button" onClick={retry}>{t('common.retry')}</button>
            </div>
          )}

          {/* ── method segmented control + forms ── */}
          <MCard plain className="m-signin-card">
            <div className="m-card-h m-card-h-split">
              <span><Icon name="shield" size={18} /> {t('auth.signinMethod')}</span>
              <span className="m-step-chip">{t('saathi.stepOf', { n: 2, total: 2 })}</span>
            </div>
            <div className="m-seg" role="group" aria-label={t('auth.signinMethod')}>
              {METHODS.filter((m) => !registration || m.id !== 'password').map((m) => (
                <button key={m.id} type="button" className={method === m.id ? 'active' : ''} onClick={() => { setMethod(m.id); setError(null); setPassword(''); }}>
                  <Icon name={m.icon} size={17} /> {t(`auth.method_${m.id}`)}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              {method === 'password' ? (
                <form onSubmit={passwordSignIn}>
                  <MField label={t('auth.identifier')} htmlFor="saathi-id">
                    <MInput
                      id="saathi-id"
                      type="text"
                      autoComplete="username"
                      placeholder={t('auth.identifierPlaceholder')}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={busy}
                      required
                    />
                  </MField>
                  <MField label={t('auth.password')} htmlFor="saathi-pass">
                    <div className="m-pw">
                      <MInput
                        id="saathi-pass"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder={t('auth.passwordHint')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={busy}
                        required
                      />
                      <button
                        type="button"
                        className="m-pw-eye"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        <Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} />
                      </button>
                    </div>
                  </MField>
                  <MBtn block type="submit" disabled={busy}>
                    {busy ? t('auth.loggingIn') : t('auth.login')}
                  </MBtn>
                  <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', textAlign: 'center', marginTop: 10 }}>
                    {t('auth.forgotPassword')}
                  </p>
                </form>
              ) : (
                <OtpVerification
                  key={`${role}-${method}`}
                  channel={method}
                  role={role}
                  enabled={Boolean(options?.[method]?.enabled)}
                  onComplete={finish}
                  onBusy={setBusy}
                />
              )}
            </div>
          </MCard>

          {/* ── mock Google ── */}
          {!profileTicket && (
            <>
              <div className="m-divider-with-text">{t('auth.orContinue')}</div>
              <button
                type="button"
                className="m-google-btn"
                onClick={() => (googleAvailable ? setGoogleOpen(true) : setError({ message: googleOn ? t('auth.noMockAccounts') : t('auth.mockGoogleOff') }))}
              >
                <GoogleG size={20} />
                {t('auth.googleButton')}
                <span className="m-mock-tag">{t('auth.mockDataBadge')}</span>
              </button>

              {/* ── demo accounts ── */}
              {options?.demoEnabled && (
                <div style={{ textAlign: 'center', marginTop: 18 }}>
                  <button type="button" className="text-button" onClick={() => setDemoOpen(true)}>
                    ✦ {t('auth.demoTitle')}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── help card ── */}
          <div className="m-help-card">
            <span className="m-help-ico"><Icon name="phone" size={20} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="m-help-title">{t('saathi.helpTitle')}</div>
              <p className="m-help-body">{t('saathi.helpBody')}</p>
              <a className="m-help-call" href="tel:155261">{t('saathi.helpCall')}</a>
            </div>
          </div>

          {/* ── trust footer ── */}
          <div className="m-trust-row" aria-label={t('auth.footerNote')}>
            <span><Icon name="shield" size={13} /> {t('saathi.trustNic')}</span>
            <span><Icon name="check" size={13} /> {t('saathi.trustDbt')}</span>
            <span><Icon name="rupee" size={13} /> {t('saathi.trustMsp')}</span>
          </div>
          <div className="m-welcome-foot">
            <BrandLogo size={34} />
            <p>{t('saathi.madeWith')} · {t('auth.footerNote')}</p>
          </div>
        </>
      )}

      {/* ── Google account picker sheet ── */}
      <Sheet open={googleOpen} onClose={() => setGoogleOpen(false)} title={t('auth.chooseAccount')} sub={t('auth.chooseAccountHint')}>
        <div className="m-gpicker-head">
          <GoogleG size={22} />
          <span>{t('auth.googleButton')}</span>
          <span className="m-mock-tag">{t('auth.mockDataBadge')}</span>
        </div>
        <div className="m-gpicker-list">
          {googleAccounts.map((account, i) => (
            <button key={account.sub} type="button" className="m-account-row" onClick={() => googleSignIn(account)} disabled={busy}>
              <span className={`m-avatar m-avatar-${i % 6}`}>{account.name.trim().charAt(0).toUpperCase()}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{account.name}</strong>
                <small className="m-account-mail">{account.email}</small>
                {account.detail && <small className="m-account-detail">{account.detail}</small>}
              </span>
              <Icon name="arrowUpRight" size={18} style={{ color: 'var(--m-ink-faint)', flex: 'none' }} />
            </button>
          ))}
        </div>
      </Sheet>

      {/* ── demo accounts sheet ── */}
      <Sheet open={demoOpen} onClose={() => setDemoOpen(false)} title={t('auth.demoTitle')} sub={t('auth.demoHint')}>
        <div className="m-stack">
          {DEMO.map((account) => (
            <button key={account.phone} type="button" className="m-account-row" onClick={() => demoSignIn(account)} disabled={busy}>
              <span className="m-avatar">{account.name.charAt(0)}</span>
              <span style={{ flex: 1 }}>
                <strong>{account.name}</strong>
                <small>{t(`common.${account.role}`)} · {account.district} · {account.phone}</small>
              </span>
              <Icon name="arrowUpRight" size={18} style={{ color: 'var(--m-ink-faint)' }} />
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
