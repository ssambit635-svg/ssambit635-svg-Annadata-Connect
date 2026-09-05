import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useAuthOptions } from '../hooks/useAuthOptions.js';
import { OtpVerification } from '../components/OtpVerification.jsx';
import { authErrorMessage } from '../utils/auth.js';
import Icon from '../components/Icon.jsx';

export default function AccountPage() {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const { options, error, retry } = useAuthOptions();
  const [channel, setChannel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);
  return (
    <div className="account-signin-page">
      <div className="page-head"><h1><Icon name="lock" size={24} /> {t('auth.accountTitle')}</h1></div>
      <p>{t('auth.accountHint')}</p>
      {linked && <div className="form-banner success" role="status">{t('auth.contactLinked')}</div>}
      {error && <div className="form-banner error" role="alert">{authErrorMessage(error, t)} <button className="text-button" onClick={retry}>{t('common.retry')}</button></div>}
      {user.isDemo ? <div className="card">{t('auth.demoContactHint')}</div> : <>
        <div className="account-contact-list">
          {[{ id: 'email', field: 'email', icon: 'mail' }, { id: 'sms', field: 'phone', icon: 'phone' }].map(({ id, field, icon }) => <div className="card account-contact" key={id}><Icon name={icon} size={22} /><div><strong>{t(id === 'sms' ? 'auth.phone' : 'auth.email')}</strong><span>{user[field] || t('auth.notLinked')}</span></div><button className="btn btn-outline btn-sm" disabled={busy || Boolean(user[`${field}Verified`])} onClick={() => { setChannel(id); setLinked(false); }}>{t(user[`${field}Verified`] ? 'auth.contactVerified' : user[field] ? 'auth.verifyContact' : 'auth.addContact')}</button></div>)}
        </div>
        {channel && <section className="card account-verification"><h2>{t(channel === 'sms' ? 'auth.linkPhone' : 'auth.linkEmail')}</h2><OtpVerification key={channel} channel={channel} role={user.role} enabled={Boolean(options?.[channel]?.enabled)} purpose="link" initialValue={user[channel === 'sms' ? 'phone' : 'email'] || ''} onBusy={setBusy} onComplete={({ user: updated }) => { updateUser(updated); setChannel(null); setLinked(true); }} /><button className="auth-alt-link" disabled={busy} onClick={() => setChannel(null)}>{t('common.cancel')}</button></section>}
      </>}
    </div>
  );
}
