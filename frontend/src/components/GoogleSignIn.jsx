import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { authService } from '../services/api/authService.js';
import { authErrorMessage } from '../utils/auth.js';

// Official 4-colour Google "G".
export function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// One shared loader is safe across role changes, remounts and React StrictMode.
let googleScript;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (googleScript) return googleScript;
  googleScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      googleScript = null;
      reject({ code: 'AUTH_GOOGLE_LOAD_FAILED' });
    };
    const timeout = setTimeout(fail, 12000);
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onerror = fail;
    script.onload = () => {
      if (!window.google?.accounts?.id) return fail();
      clearTimeout(timeout);
      resolve(window.google.accounts.id);
    };
    document.head.appendChild(script);
  });
  return googleScript;
}

// Only Google's own UI can show the user's real Google accounts. No local
// chooser, typed-email fallback, guessed account list, or automatic demo login.
export function GoogleSignIn({ role, clientId, disabled, onSuccess }) {
  const { t, lang } = useI18n();
  const container = useRef(null);
  const callbacks = useRef({ onSuccess, disabled });
  callbacks.current = { onSuccess, disabled };
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!clientId) return undefined;
    let active = true;
    let renewal;
    setReady(false);
    setError(null);
    Promise.all([loadGoogle(), authService.googleChallenge(role)]).then(([google, challenge]) => {
      if (!active || !container.current) return;
      google.initialize({
        client_id: clientId,
        nonce: challenge.nonce,
        ux_mode: 'popup',
        auto_select: false,
        button_auto_select: false,
        callback: (response) => {
          if (!active || callbacks.current.disabled) return;
          Promise.resolve().then(() => {
            if (!response?.credential) throw { code: 'AUTH_GOOGLE_INVALID' };
            return callbacks.current.onSuccess({ role, credential: response.credential, challengeId: challenge.challengeId });
          }).catch((err) => { if (active) setError(err); })
            .finally(() => { if (active) setAttempt((n) => n + 1); });
        },
      });
      container.current.replaceChildren();
      google.renderButton(container.current, {
        theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with',
        width: Math.max(200, Math.min(400, container.current.clientWidth)), locale: lang,
      });
      setReady(true);
      // Refresh an idle button's nonce instead of leaving a stale login challenge.
      renewal = setTimeout(() => { if (active) setAttempt((n) => n + 1); }, (challenge.expiresInSeconds - 15) * 1000);
    }).catch((err) => { if (active) setError(err); });
    return () => { active = false; clearTimeout(renewal); };
  }, [clientId, role, lang, attempt]);

  if (!clientId) return (
    <div className="google-signin-block">
      <button type="button" className="google-btn" disabled aria-describedby="google-setup-note"><GoogleG /><span>{t('auth.googleButton')}</span><small>{t('auth.setupNeeded')}</small></button>
      <p className="auth-small-note" id="google-setup-note">{t('auth.googleUnavailable')}</p>
    </div>
  );

  return (
    <div className="google-signin-block">
      {!ready && !error && <div className="google-btn google-loading" role="status"><GoogleG />{t('auth.loadingGoogle')}</div>}
      <div ref={container} className={`google-gis-wrap${disabled ? ' is-disabled' : ''}`} aria-busy={disabled} inert={disabled ? '' : undefined} />
      {error && <div className="auth-provider-note" role="alert">{authErrorMessage(error, t)} <button type="button" className="text-button" disabled={disabled} onClick={() => setAttempt((n) => n + 1)}>{t('common.retry')}</button></div>}
    </div>
  );
}
