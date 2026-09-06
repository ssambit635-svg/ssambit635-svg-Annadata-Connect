import { useState } from 'react';
import { API_BASE, setApiBaseOverride } from '../services/api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Tiny "server address" control shown only in the native APK (or when the
// build has no API base). Lets a sideloaded demo APK be pointed at any
// backend (Render URL, laptop on the same Wi-Fi) without rebuilding.
export function ServerSettings() {
  const { t } = useI18n();
  const isNative = !!window.Capacitor?.isNativePlatform?.();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(API_BASE);
  if (!isNative && API_BASE) return null;
  if (!isNative && import.meta.env.DEV) return null;

  function save(e) {
    e.preventDefault();
    setApiBaseOverride(value);
    window.location.reload();
  }
  return (
    <div className="server-settings">
      <button type="button" className="text-button" onClick={() => setOpen((o) => !o)}>
        ⚙ {t('auth.serverSettings')} {API_BASE ? `· ${API_BASE.replace(/^https?:\/\//, '')}` : ''}
      </button>
      {open && (
        <form onSubmit={save} className="server-settings-form">
          <label htmlFor="api-base">{t('auth.serverUrl')}</label>
          <input id="api-base" className="input" type="url" placeholder="https://annadata-connect.onrender.com" value={value} onChange={(e) => setValue(e.target.value)} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" type="submit">{t('common.save')}</button>
            <button className="btn btn-outline btn-sm" type="button" onClick={() => { setApiBaseOverride(''); window.location.reload(); }}>{t('auth.serverReset')}</button>
          </div>
          <small>{t('auth.serverHint')}</small>
        </form>
      )}
    </div>
  );
}
