import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { LanguageToggle } from '../components/LanguageToggle.jsx';
import { GoogleSignIn } from '../components/GoogleSignIn.jsx';
import { OtpVerification } from '../components/OtpVerification.jsx';
import { referenceService } from '../services/api/farmerService.js';
import { useAuthOptions } from '../hooks/useAuthOptions.js';
import { authErrorMessage } from '../utils/auth.js';
import Icon from '../components/Icon.jsx';

const ROLES = [
  { id: 'farmer', icon: 'wheat' },
  { id: 'officer', icon: 'clipboard' },
  { id: 'authority', icon: 'flag' },
];
const METHODS = [{ id: 'sms', icon: 'phone' }, { id: 'email', icon: 'mail' }, { id: 'password', icon: 'key' }];
const DEMO = [
  { role: 'farmer', phone: '9999999001', password: 'Farmer@123' },
  { role: 'officer', phone: '9999999101', password: 'Officer@123' },
  { role: 'authority', phone: '9999999201', password: 'Authority@123' },
];

export default function LoginPage({ registration = false }) {
  const { t, lang } = useI18n();
  const { login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  const { options, error: optionsError, retry } = useAuthOptions();
  const [role, setRole] = useState('farmer');
  const [method, setMethod] = useState('sms');
  const [profileTicket, setProfileTicket] = useState(null);
  const [villages, setVillages] = useState([]);
  const [villagesError, setVillagesError] = useState(false);
  const [villageAttempt, setVillageAttempt] = useState(0);
  const [profile, setProfile] = useState({ name: '', villageId: '', password: '' });
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profileTicket) return undefined;
    let active = true;
    setVillagesError(false);
    referenceService.villages().then((data) => { if (active) setVillages(data.villages); })
      .catch(() => { if (active) setVillagesError(true); });
    return () => { active = false; };
  }, [profileTicket, villageAttempt]);

  function finish(data) {
    setError(null);
    if (data.registrationRequired) {
      setProfileTicket(data);
      setProfile({ name: data.profile.name || '', villageId: '', password: '' });
    } else if (data.user && data.token) {
      navigate(homeFor(data.user.role), { replace: true });
    }
  }
  async function googleSignIn(payload) {
    setBusy(true);
    setError(null);
    try { finish(await loginWithGoogle(payload)); }
    catch (err) { setError(err); throw err; }
    finally { setBusy(false); }
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
  async function completeProfile(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try { finish(await register({ ...profile, name: profile.name.trim(), registrationToken: profileTicket.registrationToken, preferredLanguage: lang })); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  }
  async function demoSignIn(account) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { finish(await login(account.phone, account.password, account.role)); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  }
  function selectRole(next) {
    setRole(next); setProfileTicket(null); setError(null); setPassword(''); setShowPassword(false);
  }
  function selectMethod(next) {
    setMethod(next); setError(null); setPassword(''); setShowPassword(false);
  }

  return (
    <div className="signin-page">
      <header className="signin-header">
        <Link to="/" className="signin-brand"><span className="signin-brand-mark"><Icon name="wheat" size={25} /></span><span><strong>{t('app.name')}</strong><small>अन्नदाता कनेक्ट</small></span></Link>
        <div className="signin-header-actions"><Link to="/" className="signin-home">{t('auth.backHome')} <Icon name="arrowUpRight" size={14} /></Link><LanguageToggle /></div>
      </header>
      <main className="signin-shell">
        <aside className="signin-story">
          <div className="signin-eyebrow"><span />{t('auth.storyEyebrow')}</div>
          <h1>{t('auth.storyTitle')}<em>{t('auth.storyAccent')}</em></h1>
          <p className="signin-story-intro">{t('auth.storyIntro')}</p>
          <div className="signin-benefits">
            <div><span><Icon name="phone" size={20} /></span><p><strong>{t('auth.benefitPhone')}</strong><small>{t('auth.benefitPhoneHint')}</small></p></div>
            <div><span><Icon name="mail" size={20} /></span><p><strong>{t('auth.benefitEmail')}</strong><small>{t('auth.benefitEmailHint')}</small></p></div>
            <div><span><Icon name="lock" size={20} /></span><p><strong>{t('auth.benefitSecure')}</strong><small>{t('auth.benefitSecureHint')}</small></p></div>
          </div>
          <div className="signin-story-footer"><Icon name="wheat" size={26} /><p>{t('auth.storyFooter')}<span>{t('auth.storyFooterHint')}</span></p></div>
        </aside>
        <section className="signin-panel" aria-labelledby="signin-title">
          <div className="signin-panel-heading"><span className="signin-kicker">{t(profileTicket ? 'auth.profileStep' : 'auth.welcomeEyebrow')}</span><h2 id="signin-title">{t(profileTicket ? 'auth.newFarmerTitle' : registration ? 'auth.registerTitle' : 'auth.welcomeTitle')}</h2><p>{t(profileTicket ? 'auth.newFarmerHint' : registration ? 'auth.registerIntro' : 'auth.chooseMethod')}</p></div>
          {!profileTicket && <>
            <div className="role-toggle" role="group" aria-label={t('auth.loginAs')}>
              {ROLES.filter((item) => !registration || item.id === 'farmer').map((item) => <button key={item.id} type="button" aria-pressed={role === item.id} className={`role-toggle-btn${role === item.id ? ' active' : ''}`} disabled={busy} onClick={() => selectRole(item.id)}><Icon name={item.icon} size={17} /><span>{t(`common.${item.id}`)}</span></button>)}
            </div>
            <p className="auth-role-hint">{t(role === 'farmer' ? 'auth.farmerTabHint' : 'auth.staffTabHint')}</p>
          </>}
          {error && <div className="form-banner error" role="alert">{authErrorMessage(error, t)}</div>}
          {profileTicket ? (
            <form onSubmit={completeProfile} className="signin-profile" aria-busy={busy}>
              <div className="auth-verified-contact"><Icon name="checkCircle" size={18} /><span>{profileTicket.profile.phone ? `+91 ${profileTicket.profile.phone}` : profileTicket.profile.email}<small>{t('auth.contactVerified')}</small></span></div>
              <div className="field"><label htmlFor="profile-name">{t('auth.name')}</label><input id="profile-name" className="input" autoComplete="name" minLength={2} maxLength={100} required autoFocus value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} disabled={busy} /></div>
              <div className="field"><label htmlFor="profile-village">{t('auth.village')}</label><select id="profile-village" className="select" required value={profile.villageId} onChange={(event) => setProfile({ ...profile, villageId: event.target.value })} disabled={busy || !villages.length}><option value="">{t('auth.chooseVillage')}</option>{villages.map((village) => <option key={village.id} value={village.id}>{lang === 'hi' ? village.nameHi : village.nameEn}</option>)}</select>{villagesError && <div className="auth-provider-note" role="alert">{t('common.errorNetwork')} <button type="button" className="text-button" onClick={() => setVillageAttempt((n) => n + 1)}>{t('common.retry')}</button></div>}</div>
              <div className="field"><label htmlFor="profile-password">{t('auth.optionalPassword')}</label><input id="profile-password" className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={profile.password} onChange={(event) => setProfile({ ...profile, password: event.target.value })} disabled={busy} /><div className="hint">{t('auth.optionalPasswordHint')}</div></div>
              <button className="btn btn-primary btn-block" disabled={busy || !villages.length}>{busy ? t('auth.creatingAccount') : t('auth.createAccount')} <Icon name="arrowUpRight" size={17} /></button>
              <button type="button" className="auth-alt-link" disabled={busy} onClick={() => { setProfileTicket(null); setError(null); }}>{t('auth.startAgain')}</button>
            </form>
          ) : <>
            {optionsError ? <div className="auth-provider-note" role="alert">{authErrorMessage(optionsError, t)} <button type="button" className="text-button" onClick={retry}>{t('common.retry')}</button></div> : !options ? <p className="auth-small-note" role="status">{t('auth.loadingOptions')}</p> : <GoogleSignIn key={role} role={role} clientId={options.google.enabled ? options.google.clientId : null} disabled={busy} onSuccess={googleSignIn} />}
            <div className="signin-divider"><span>{t('auth.orContinue')}</span></div>
            <div className="signin-methods" role="group" aria-label={t('auth.signinMethod')}>
              {METHODS.filter((item) => !registration || item.id !== 'password').map((item) => <button key={item.id} type="button" aria-pressed={method === item.id} className={method === item.id ? 'active' : ''} disabled={busy} onClick={() => selectMethod(item.id)}><Icon name={item.icon} size={19} /><span>{t(`auth.method_${item.id}`)}</span></button>)}
            </div>
            <div className="signin-form-area">
              {method === 'password' ? <form onSubmit={passwordSignIn} aria-busy={busy}>
                <div className="field"><label htmlFor="login-identifier">{t('auth.identifier')}</label><input id="login-identifier" className="input" type="text" autoComplete="username" placeholder={t('auth.identifierPlaceholder')} value={identifier} onChange={(event) => setIdentifier(event.target.value)} required disabled={busy} /></div>
                <div className="field"><label htmlFor="login-password">{t('auth.password')}</label><div className="pw-field"><input id="login-password" className="input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /><button type="button" className="btn btn-outline btn-sm" onClick={() => setShowPassword(!showPassword)} aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')} aria-pressed={showPassword}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} /></button></div></div>
                <button className="btn btn-primary btn-block" disabled={busy}>{busy ? t('auth.loggingIn') : t('auth.login')} <Icon name="arrowUpRight" size={17} /></button>
                <button type="button" className="auth-alt-link" disabled={busy} onClick={() => selectMethod('sms')}>{t('auth.forgotPassword')}</button>
              </form> : <OtpVerification key={`${role}:${method}`} channel={method} role={role} enabled={Boolean(options?.[method]?.enabled)} onComplete={finish} onBusy={setBusy} />}
            </div>
            <p className="signin-security"><Icon name="lock" size={14} />{t('auth.neverShareCode')}</p>
            <p className="auth-register-line">{t(registration ? 'auth.haveAccount' : 'auth.noAccount')} <Link to={registration ? '/login' : '/register'}>{t(registration ? 'auth.login' : 'auth.registerFarmer')}</Link></p>
            {options?.demoEnabled && <details className="signin-demo"><summary>{t('auth.demoTitle')}<span>{t('auth.demoOnly')}</span></summary><p>{t('auth.demoHint')}</p><div>{DEMO.map((account) => <button key={account.role} type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => demoSignIn(account)}>{t(`common.${account.role}`)}</button>)}</div></details>}
          </>}
        </section>
      </main>
      <footer className="signin-footer"><span>{t('app.tagline')}</span><span>{t('auth.footerNote')}</span></footer>
    </div>
  );
}
