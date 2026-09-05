import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import Icon from './Icon.jsx';

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

// Demo accounts offered in the account chooser (matched to the backend seed).
const DEMO_GOOGLE_ACCOUNTS = {
  officer: [
    { name: 'Rashmi Das', email: 'rashmi.das.anc@gmail.com' },
    { name: 'Manoj Behera', email: 'manoj.behera.anc@gmail.com' },
  ],
  authority: [{ name: 'Suresh IAS (Dist. Admin)', email: 'district.admin.anc@gmail.com' }],
};

const AVATAR_COLOURS = ['#0e5b3b', '#1d4ed8', '#92600a', '#b42318'];

function avatarColour(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

function AccountAvatar({ name, email }) {
  const letter = (name || email || '?').trim().charAt(0).toUpperCase();
  return (
    <span className="gac-avatar" style={{ background: avatarColour(email || name || 'x') }} aria-hidden="true">
      {letter}
    </span>
  );
}

/**
 * Google sign-in for officers and district authorities.
 *
 * - When VITE_GOOGLE_CLIENT_ID is set, the real Google Identity Services
 *   button is rendered and the returned ID-token credential is sent to the
 *   backend for verification.
 * - Without a client id the component falls back to a built-in account
 *   chooser so the flow works out of the box (backend demo mode). Any Google
 *   address can be used and a matching account is created on first sign-in.
 */
export function GoogleSignIn({ role, disabled, onSuccess, onError }) {
  const { t } = useI18n();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const [chooserOpen, setChooserOpen] = useState(false);
  const [anotherOpen, setAnotherOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const gisRef = useRef(null);
  // Keep the latest callback without re-initializing GIS on every parent render.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  // Real Google Identity Services button.
  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    const renderButton = () => {
      if (cancelled || !window.google?.accounts?.id || !gisRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            onSuccessRef.current({ role, credential: response.credential });
          }
        },
      });
      window.google.accounts.id.renderButton(gisRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 280,
      });
    };
    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = renderButton;
      document.head.appendChild(s);
    }
    return () => {
      cancelled = true;
    };
  }, [clientId, role]);

  async function signInWith(demoEmail, demoName) {
    setBusy(true);
    try {
      await onSuccess({ role, email: demoEmail, name: demoName || '' });
    } catch (err) {
      onError?.(err);
    } finally {
      setBusy(false);
    }
  }

  function submitAnother(e) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      onError?.({ message: t('auth.googleInvalidEmail') });
      return;
    }
    signInWith(value, name.trim());
  }

  if (clientId) {
    return <div className="google-gis-wrap" ref={gisRef} />;
  }

  return (
    <>
      <button
        type="button"
        className="google-btn"
        disabled={disabled || busy}
        onClick={() => {
          setChooserOpen(true);
          setAnotherOpen(false);
          setEmail('');
          setName('');
        }}
      >
        <GoogleG size={18} />
        <span>{busy ? t('auth.googleBusy') : t('auth.googleButton')}</span>
      </button>

      {chooserOpen && (
        <div className="gac-overlay" role="dialog" aria-modal="true" aria-label={t('auth.googleChooserTitle')} onClick={() => !busy && setChooserOpen(false)}>
          <div className="gac-card" onClick={(e) => e.stopPropagation()}>
            <div className="gac-head">
              <GoogleG size={26} />
              <h2>{t('auth.googleChooserTitle')}</h2>
              <p>{t('auth.googleChooserSub')}</p>
            </div>

            <div className="gac-list">
              {DEMO_GOOGLE_ACCOUNTS[role]?.map((a) => (
                <button key={a.email} type="button" className="gac-row" disabled={busy} onClick={() => signInWith(a.email, a.name)}>
                  <AccountAvatar name={a.name} email={a.email} />
                  <span className="gac-row-text">
                    <strong>{a.name}</strong>
                    <span>{a.email}</span>
                  </span>
                  {busy ? <span className="gac-spinner" aria-hidden="true" /> : <Icon name="chevronDown" size={16} className="gac-row-caret" />}
                </button>
              ))}

              {!anotherOpen ? (
                <button type="button" className="gac-row gac-another" disabled={busy} onClick={() => setAnotherOpen(true)}>
                  <span className="gac-avatar gac-avatar-plain" aria-hidden="true">
                    <Icon name="plus" size={17} />
                  </span>
                  <span className="gac-row-text">
                    <strong>{t('auth.googleAnother')}</strong>
                  </span>
                </button>
              ) : (
                <form className="gac-form" onSubmit={submitAnother}>
                  <div className="field">
                    <label htmlFor="gemail">{t('auth.googleEmail')}</label>
                    <input
                      id="gemail"
                      className="input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="gname">{t('auth.googleName')}</label>
                    <input id="gname" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                    {busy ? t('auth.googleBusy') : t('auth.googleContinue')}
                  </button>
                </form>
              )}
            </div>

            <p className="gac-note">{t('auth.googleDemoNote')}</p>
          </div>
        </div>
      )}
    </>
  );
}
