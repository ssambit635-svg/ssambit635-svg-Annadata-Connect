import { useI18n } from '../i18n/I18nContext.jsx';
import Icon from './Icon.jsx';

// Branded loading splash — the app always shows the logo while fetching,
// so a slow network never looks like a broken/blank page.
export function Loading({ label }) {
  const { t } = useI18n();
  return (
    <div className="state splash" role="status" aria-live="polite">
      <div className="splash-mark" aria-hidden="true">
        <Icon name="wheat" size={32} strokeWidth={2} />
      </div>
      <div className="splash-word">
        <strong>अन्नदाता कनेक्ट</strong>
        <small>Annadata Connect</small>
      </div>
      <div className="spinner" />
      <div className="splash-label">{label || t('common.loading')}</div>
    </div>
  );
}

// Friendly, bilingual error. API messages are shown when available;
// known codes and network failures map to translated text.
export function ErrorState({ error, onRetry }) {
  const { t } = useI18n();
  const network = error?.code === 'NETWORK_ERROR';
  const message = network
    ? t('common.errorNetwork')
    : error?.code === 'AUTH_INVALID_CREDENTIALS'
      ? t('auth.invalidLogin')
      : error?.message && error?.message !== 'Unexpected error'
        ? error.message
        : t('common.errorGeneric');
  return (
    <div className="state error-card" role="alert">
      <div className="state-ico" aria-hidden="true">
        <Icon name={network ? 'wifiOff' : 'alertTriangle'} size={30} />
      </div>
      <h2>{t('common.crashTitle')}</h2>
      <p>{message}</p>
      {network && <p className="hint">{t('common.offlineHint')}</p>}
      {onRetry && (
        <button className="btn btn-primary btn-sm" onClick={onRetry}>
          <Icon name="refresh" size={15} /> {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  const { t } = useI18n();
  return (
    <div className="state card">
      <div className="state-ico" aria-hidden="true"><Icon name="wheat" size={30} /></div>
      <p style={{ fontWeight: 600 }}>{title || t('common.empty')}</p>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}
