// More/Account — profile, language, verified contacts, server address
// (for sideloaded APKs), about and sign-out.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useAuthOptions } from '../../hooks/useAuthOptions.js';
import { OtpVerification } from '../../components/OtpVerification.jsx';
import { authErrorMessage } from '../../utils/auth.js';
import { API_BASE, setApiBaseOverride } from '../../services/api/client.js';
import Icon from '../../components/Icon.jsx';
import { BrandLogo } from '../../components/BrandLogo.jsx';
import { MCard, MBtn, MField, MInput, Sheet, MConfirm, MLangPills } from '../ui.jsx';

export default function Account() {
  const { user, role, logout, updateUser } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { options, error: optionsError, retry } = useAuthOptions();

  const [channel, setChannel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(API_BASE);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const isNative = Boolean(window.Capacitor?.isNativePlatform?.());

  function doLogout() {
    setLogoutOpen(false);
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="m-stagger">
      {/* ── profile card ── */}
      <MCard plain className="green">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              width: 64, height: 64, flex: 'none', display: 'grid', placeItems: 'center',
              borderRadius: '50%', background: 'rgba(251,191,36,0.2)', border: '2.5px dashed var(--m-gold)',
              fontFamily: 'var(--m-f-display)', fontSize: 26, fontWeight: 650, color: 'var(--m-gold)',
            }}
          >
            {(user?.name || '?').trim().charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 21, fontWeight: 650, color: '#fff', fontFamily: 'var(--m-f-display)' }}>{user?.name}</h2>
            <p style={{ color: '#cfe2cd', fontSize: 13.5 }}>{user?.village ? user.village.nameEn || user.village.nameHi || '' : ''} · {user?.district || ''}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span className="m-badge gold">{t(`common.${role}`)}</span>
              <span className="m-badge neutral">{user?.farmerId || user?.phone || user?.email}</span>
            </div>
          </div>
        </div>
      </MCard>

      {/* ── language ── */}
      <MCard plain>
        <div className="m-card-h"><Icon name="chat" size={19} /> {t('landing.languageLabel')}</div>
        <MLangPills variant="light" />
      </MCard>

      {/* ── verified contacts ── */}
      <MCard plain>
        <div className="m-card-h"><Icon name="lock" size={19} /> {t('auth.accountTitle')}</div>
        <p style={{ fontSize: 13, color: 'var(--m-ink-soft)', marginBottom: 10 }}>{t('auth.accountHint')}</p>
        {linked && <div className="m-banner success" style={{ marginBottom: 10 }}><Icon name="checkCircle" size={16} />{t('auth.contactLinked')}</div>}
        {optionsError && (
          <div className="m-banner warning">
            <Icon name="wifiOff" size={16} />
            <span style={{ flex: 1 }}>{authErrorMessage(optionsError, t)}</span>
            <button type="button" className="text-button" onClick={retry}>{t('common.retry')}</button>
          </div>
        )}
        {[
          { id: 'sms', field: 'phone', icon: 'phone', label: 'auth.phone' },
          { id: 'email', field: 'email', icon: 'mail', label: 'auth.email' },
        ].map(({ id, field, icon, label }) => (
          <div key={id} className="m-row" style={{ marginBottom: 10 }}>
            <span className="m-row-ico"><Icon name={icon} size={20} /></span>
            <div className="m-row-main">
              <div className="m-row-title">{t(label)}</div>
              <div className="m-row-sub">{user?.[field] || t('auth.notLinked')}</div>
            </div>
            {user?.[`${field}Verified`] ? (
              <span className="m-badge success"><span className="m-dot" />{t('auth.contactVerified')}</span>
            ) : (
              <MBtn size="sm" variant="soft" disabled={busy} onClick={() => { setChannel(id); setLinked(false); }}>
                {user?.[field] ? t('auth.verifyContact') : t('auth.addContact')}
              </MBtn>
            )}
          </div>
        ))}
      </MCard>

      {/* ── sign out ── */}
      <MCard plain>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <BrandLogo size={44} />
          <div style={{ flex: 1 }}>
            <div className="m-display" style={{ fontWeight: 800, fontSize: 16, color: 'var(--m-green-forest)' }}>{t('saathi.name')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--m-ink-soft)' }}>{t('saathi.madeWith')}</div>
          </div>
          {isNative && (
            <button type="button" className="m-chip" onClick={() => setServerOpen(true)}><Icon name="more" size={15} /></button>
          )}
        </div>
        <MBtn block variant="danger" style={{ marginTop: 12 }} onClick={() => setLogoutOpen(true)} icon={<Icon name="logout" size={18} />}>
          {t('nav.logout')}
        </MBtn>
      </MCard>

      <div style={{ textAlign: 'center', margin: '6px 0 10px' }}>
        <p style={{ fontSize: 11.5, color: 'var(--m-ink-faint)', marginTop: 6 }}>
          {t('app.name')} · {t('app.tagline')} · v1.0
        </p>
      </div>

      {/* ── contact verification sheet ── */}
      <Sheet
        open={Boolean(channel)}
        onClose={() => setChannel(null)}
        title={t(channel === 'sms' ? 'auth.linkPhone' : 'auth.linkEmail')}
      >
        {channel && (
          <>
            <OtpVerification
              key={channel}
              channel={channel}
              role={user.role}
              enabled={Boolean(options?.[channel]?.enabled)}
              purpose="link"
              initialValue={user[channel === 'sms' ? 'phone' : 'email'] || ''}
              onBusy={setBusy}
              onComplete={({ user: updated }) => { updateUser(updated); setChannel(null); setLinked(true); }}
            />
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button type="button" className="text-button" onClick={() => setChannel(null)}>{t('common.cancel')}</button>
            </div>
          </>
        )}
      </Sheet>

      {/* ── server URL sheet (native only) ── */}
      <Sheet open={serverOpen} onClose={() => setServerOpen(false)} title={t('auth.serverSettings')} sub={t('auth.serverHint')}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApiBaseOverride(serverUrl);
            window.location.reload();
          }}
        >
          <MField label={t('auth.serverUrl')} htmlFor="saathi-server">
            <MInput id="saathi-server" type="url" placeholder="https://annadata-connect.onrender.com" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
          </MField>
          <div className="m-btn-row">
            <MBtn variant="primary" type="submit">{t('common.save')}</MBtn>
            <MBtn variant="soft" onClick={() => { setApiBaseOverride(''); window.location.reload(); }}>{t('auth.serverReset')}</MBtn>
          </div>
        </form>
      </Sheet>

      <MConfirm
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={doLogout}
        title={t('nav.logout')}
        sub={t('saathi.tagline')}
        confirmLabel={t('nav.logout')}
        danger
      />
    </div>
  );
}
