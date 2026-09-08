import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useAuthOptions } from '../hooks/useAuthOptions.js';
import { OtpVerification } from '../components/OtpVerification.jsx';
import { authErrorMessage } from '../utils/auth.js';
import Icon from '../components/Icon.jsx';

const CONTACTS = [
  { id: 'email', field: 'email', icon: 'mail', label: 'auth.email', link: 'auth.linkEmail' },
  { id: 'sms', field: 'phone', icon: 'phone', label: 'auth.phone', link: 'auth.linkPhone' },
];

// Account → sign-in & contact details. Each contact row shows its state
// (verified badge, or a clear "Verify" / "Add & verify" action) and the OTP
// flow opens inline below the list.
export default function AccountPage() {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const { options, error, retry } = useAuthOptions();
  const [channel, setChannel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);

  const active = CONTACTS.find((c) => c.id === channel);

  return (
    <div className="account-signin-page">
      <div className="page-head">
        <div>
          <h1><Icon name="lock" size={24} /> {t('auth.accountTitle')}</h1>
          <p className="page-sub">{t('auth.accountHint')}</p>
        </div>
      </div>

      {linked && <div className="form-banner success" role="status">{t('auth.contactLinked')}</div>}
      {error && (
        <div className="form-banner error" role="alert">
          {authErrorMessage(error, t)} <button type="button" className="text-button" onClick={retry}>{t('common.retry')}</button>
        </div>
      )}

      <div className="account-contact-list">
        {CONTACTS.map(({ id, field, icon, label }) => {
          const value = user[field];
          const verified = Boolean(user[`${field}Verified`]);
          return (
            <div className={`card account-contact${channel === id ? ' is-editing' : ''}`} key={id}>
              <Icon name={icon} size={22} />
              <div>
                <strong>{t(label)}</strong>
                <span>{value || t('auth.notLinked')}</span>
              </div>
              {verified ? (
                <span className="badge success account-verified">
                  <Icon name="checkCircle" size={14} /> {t('auth.contactVerified')}
                </span>
              ) : (
                <button
                  type="button"
                  className={`btn btn-sm ${value ? 'btn-primary' : 'btn-outline'}`}
                  disabled={busy}
                  onClick={() => { setChannel(id); setLinked(false); }}
                >
                  <Icon name={value ? 'shield' : 'plus'} size={15} />
                  {t(value ? 'auth.verifyContact' : 'auth.addContact')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {active && (
        <section className="card account-verification" aria-live="polite">
          <h2><Icon name={active.icon} size={18} /> {t(active.link)}</h2>
          <OtpVerification
            key={active.id}
            channel={active.id}
            role={user.role}
            enabled={Boolean(options?.[active.id]?.enabled)}
            purpose="link"
            initialValue={user[active.field] || ''}
            onBusy={setBusy}
            onComplete={({ user: updated }) => { updateUser(updated); setChannel(null); setLinked(true); }}
          />
          <button type="button" className="btn btn-ghost btn-sm account-cancel" disabled={busy} onClick={() => setChannel(null)}>
            <Icon name="x" size={15} /> {t('common.cancel')}
          </button>
        </section>
      )}
    </div>
  );
}
