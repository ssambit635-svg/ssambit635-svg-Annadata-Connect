import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { authService } from '../services/api/authService.js';
import { authErrorMessage, normalizeMobileInput } from '../utils/auth.js';
import Icon from './Icon.jsx';

// Shared verified sign-in/contact-link flow. A request never creates a session.
export function OtpVerification({ channel, role, enabled, onComplete, onBusy, purpose = 'signin', initialValue = '' }) {
  const { t } = useI18n();
  const { verifyOtp } = useAuth();
  const [destination, setDestination] = useState(initialValue);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [exhausted, setExhausted] = useState(false);
  const codeRef = useRef(null);
  const isSms = channel === 'sms';
  const retryIn = Math.max(0, Math.ceil((retryAt - clock) / 1000));
  const expiresIn = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - clock) / 1000)) : 0;

  useEffect(() => {
    if (!challenge && !retryAt) return undefined;
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [challenge, retryAt]);
  useEffect(() => { if (challenge) codeRef.current?.focus(); }, [challenge]);

  function working(value) { setBusy(value); onBusy?.(value); }
  function failure(err) {
    setError(err);
    if (err.details?.retryAfterSeconds) {
      setRetryAt(Date.now() + err.details.retryAfterSeconds * 1000);
      setClock(Date.now());
    }
  }

  async function requestCode(event) {
    event?.preventDefault();
    if (busy || !enabled || retryIn > 0) return;
    setError(null);
    const value = isSms ? normalizeMobileInput(destination) : destination.trim().toLowerCase();
    if (isSms ? !/^[6-9]\d{9}$/.test(value) : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError({ message: t(isSms ? 'auth.invalidPhone' : 'auth.invalidEmail') });
      return;
    }
    working(true);
    try {
      const send = purpose === 'link' ? authService.requestContact : authService.requestOtp;
      const result = await send({ channel, destination: value, role });
      const now = Date.now();
      setDestination(value);
      setChallenge({ ...result, expiresAt: now + result.expiresInSeconds * 1000 });
      setRetryAt(now + result.retryAfterSeconds * 1000);
      setClock(now);
      setCode('');
      setExhausted(false);
    } catch (err) { failure(err); }
    finally { working(false); }
  }

  async function checkCode(event) {
    event.preventDefault();
    if (busy || !challenge || expiresIn === 0 || exhausted) return;
    setError(null);
    if (!/^\d{6}$/.test(code)) { setError({ message: t('auth.codeHint') }); return; }
    working(true);
    try {
      const verify = purpose === 'link' ? authService.verifyContact : verifyOtp;
      const result = await verify({ challengeId: challenge.challengeId, code, role });
      await onComplete(result);
    } catch (err) {
      if (err.code === 'AUTH_CHALLENGE_EXPIRED' || err.details?.attemptsRemaining === 0 || ['AUTH_ROLE_MISMATCH', 'AUTH_APPROVAL_REQUIRED', 'AUTH_IDENTITY_CONFLICT', 'AUTH_ACCOUNT_DISABLED'].includes(err.code)) setExhausted(true);
      failure(err);
    } finally { working(false); }
  }

  if (challenge) return (
    <div className="otp-flow" aria-busy={busy}>
      <div className="otp-sent-icon"><Icon name={isSms ? 'phone' : 'mail'} size={23} /></div>
      <h3 className="auth-step-title">{t(isSms ? 'auth.checkPhone' : 'auth.checkEmail')}</h3>
      <p className="auth-step-sub" role="status">{t('auth.codeSentTo')} <strong>{challenge.destination}</strong></p>
      {challenge.mockCode && <div className="mock-code-card">
        <span className="mock-code-icon"><Icon name={isSms ? 'phone' : 'mail'} size={17} /></span>
        <div className="mock-code-text">
          <strong>{t(isSms ? 'auth.mockSmsTitle' : 'auth.mockEmailTitle')}</strong>
          <code className="mock-code-value">{challenge.mockCode}</code>
          <small>{t('auth.mockCodeHint')}</small>
        </div>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy || exhausted} onClick={() => { setCode(challenge.mockCode); codeRef.current?.focus(); }}>{t('auth.fillCode')}</button>
      </div>}
      {error && <div className="form-banner error" role="alert">{authErrorMessage(error, t)}</div>}
      <form onSubmit={checkCode}>
        <div className="field">
          <label htmlFor="verification-code">{t('auth.codeLabel')}</label>
          <input id="verification-code" ref={codeRef} className="input otp-code" inputMode="numeric" autoComplete="one-time-code" type="text" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={busy || exhausted} aria-describedby="otp-expiry" aria-invalid={Boolean(error)} />
          <div className="hint" id="otp-expiry">{expiresIn > 0 && !exhausted ? t('auth.codeExpires', { time: `${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, '0')}` }) : t('auth.codeExpired')}</div>
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || expiresIn === 0 || exhausted || code.length !== 6}>{busy ? t('auth.verifying') : t(purpose === 'link' ? 'auth.verifyAndLink' : 'auth.verifyAndSignIn')} <Icon name="arrowUpRight" size={17} /></button>
      </form>
      <div className="otp-actions">
        <button type="button" className="text-button" onClick={requestCode} disabled={busy || retryIn > 0}>{retryIn ? t('auth.resendIn', { seconds: retryIn }) : t('auth.resendCode')}</button>
        <button type="button" className="text-button" disabled={busy} onClick={() => { setChallenge(null); setCode(''); setError(null); }}>{t(isSms ? 'auth.changeNumber' : 'auth.changeEmail')}</button>
      </div>
      <p className="auth-small-note">{t(isSms ? 'auth.smsDeliveryHint' : 'auth.emailDeliveryHint')}</p>
    </div>
  );

  return (
    <form onSubmit={requestCode} aria-busy={busy}>
      {error && <div className="form-banner error" role="alert">{authErrorMessage(error, t)}</div>}
      <div className="field">
        <label htmlFor="otp-destination">{t(isSms ? 'auth.phone' : 'auth.email')}</label>
        <div className={isSms ? 'phone-field' : ''}>
          {isSms && <span className="phone-prefix">+91</span>}
          <input id="otp-destination" className={`input${isSms ? ' phone-input' : ''}`} type={isSms ? 'tel' : 'email'} inputMode={isSms ? 'tel' : 'email'} autoComplete={isSms ? 'tel-national' : 'email'} placeholder={isSms ? t('auth.phonePlaceholder') : 'you@example.com'} value={destination} maxLength={isSms ? 18 : 254} onChange={(event) => { setDestination(isSms ? normalizeMobileInput(event.target.value) : event.target.value); setError(null); }} disabled={busy} aria-describedby="contact-hint" required />
        </div>
        <div className="hint" id="contact-hint">{t(isSms ? 'auth.smsHint' : 'auth.emailHint')}</div>
      </div>
      <button className="btn btn-primary btn-block" disabled={busy || !enabled || retryIn > 0}>{busy ? t('auth.sendingCode') : retryIn > 0 ? t('auth.resendIn', { seconds: retryIn }) : t(isSms ? 'auth.sendSmsCode' : 'auth.sendEmailCode')} <Icon name="arrowUpRight" size={17} /></button>
      {!enabled && <p className="auth-provider-note"><Icon name="info" size={16} />{t(isSms ? 'auth.smsUnavailable' : 'auth.emailUnavailable')}</p>}
    </form>
  );
}
