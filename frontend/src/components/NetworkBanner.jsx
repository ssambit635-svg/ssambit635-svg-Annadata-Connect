import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';

// Free-tier backends (Render) sleep after 15 min and take ~30-60 s to wake.
// Show a friendly banner while the first request is pending, and an offline
// notice when the browser reports no connectivity.
export function NetworkBanner() {
  const { t } = useI18n();
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const slow = () => setWaking(true);
    const ok = () => setWaking(false);
    window.addEventListener('ks:api-slow', slow);
    window.addEventListener('ks:api-ok', ok);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('ks:api-slow', slow);
      window.removeEventListener('ks:api-ok', ok);
    };
  }, []);

  if (offline) return <div className="net-banner" role="status"><span className="dot" /> {t('common.offlineBanner')}</div>;
  if (waking) return <div className="net-banner" role="status"><span className="dot" /> {t('common.wakingBanner')}</div>;
  return null;
}
