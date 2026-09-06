import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';

// Official 4-colour Google "G" — kept so the mock button still looks the part.
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

const SWITCH_KEY = 'ks-mock-google';
const readSwitch = () => {
  try { return localStorage.getItem(SWITCH_KEY) !== 'off'; } catch { return true; }
};

// Fake Google sign-in: no Google script, no OAuth, no ID token. The button opens
// a Google-styled picker over the sample accounts served by /api/auth/options,
// and the switch beside it turns the whole thing on or off.
export function GoogleSignIn({ role, accounts = [], enabled = true, disabled, onSuccess }) {
  const { t } = useI18n();
  const [on, setOn] = useState(readSwitch);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const roleAccounts = accounts.filter((account) => account.role === role);
  const available = enabled && on && roleAccounts.length > 0;

  // A role change closes the picker: the account list is role-scoped.
  useEffect(() => { setOpen(false); }, [role]);
  useEffect(() => {
    if (!open) return undefined;
    listRef.current?.querySelector('button')?.focus();
    const onKey = (event) => { if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function toggle() {
    const next = !on;
    setOn(next);
    if (!next) setOpen(false);
    try { localStorage.setItem(SWITCH_KEY, next ? 'on' : 'off'); } catch { /* private mode: keep in-memory state */ }
  }

  async function pick(account) {
    setOpen(false);
    try {
      await onSuccess({ role, email: account.email });
    } catch {
      // The sign-in page owns the error banner; just hand focus back.
      buttonRef.current?.focus();
    }
  }

  return (
    <div className="google-signin-block">
      <div className="mock-switch">
        <span className="mock-switch-text">
          <strong>{t('auth.mockSwitchLabel')}</strong>
          <small>{on ? t('auth.mockSwitchOn') : t('auth.mockSwitchOff')}</small>
        </span>
        <button type="button" role="switch" aria-checked={on} className={`mock-switch-control${on ? ' is-on' : ''}`} onClick={toggle} disabled={disabled} aria-label={t('auth.mockSwitchLabel')}>
          <span className="mock-switch-knob" />
        </button>
      </div>

      <button ref={buttonRef} type="button" className="google-btn" disabled={disabled || !available} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <GoogleG />
        <span>{t('auth.googleButton')}</span>
        <small>{t('auth.mockDataBadge')}</small>
      </button>

      {!on && <p className="auth-small-note">{t('auth.mockGoogleOff')}</p>}
      {on && enabled && roleAccounts.length === 0 && <p className="auth-small-note">{t('auth.noMockAccounts')}</p>}

      {open && (
        <div className="mock-google-overlay" onClick={() => setOpen(false)}>
          <div className="mock-google-dialog" role="dialog" aria-modal="true" aria-labelledby="mock-google-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <GoogleG size={22} />
              <div>
                <h3 id="mock-google-title">{t('auth.chooseAccount')}</h3>
                <p>{t('auth.chooseAccountHint')}</p>
              </div>
            </header>
            <ul ref={listRef}>
              {roleAccounts.map((account) => (
                <li key={account.sub}>
                  <button type="button" disabled={disabled} onClick={() => pick(account)}>
                    <span className="mock-avatar" aria-hidden="true">{account.name.trim().charAt(0).toUpperCase()}</span>
                    <span className="mock-account-text">
                      <strong>{account.name}</strong>
                      <small>{account.email}</small>
                      {account.detail && <em>{account.detail}</em>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <footer>
              <span className="mock-badge">{t('auth.mockDataBadge')}</span>
              <button type="button" className="text-button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }}>{t('common.cancel')}</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
