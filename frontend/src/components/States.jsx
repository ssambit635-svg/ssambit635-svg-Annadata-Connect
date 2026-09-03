import { useI18n } from '../i18n/I18nContext.jsx';
import Icon from './Icon.jsx';

export function Loading({ label }) {
  const { t } = useI18n();
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" />
      <div>{label || t('common.loading')}</div>
    </div>
  );
}

// Displays a friendly, bilingual error. API messages are shown when available;
// known codes and network failures map to translated text.
export function ErrorState({ error, onRetry }) {
  const { t } = useI18n();
  const message =
    error?.code === 'NETWORK_ERROR'
      ? t('common.errorNetwork')
      : error?.code === 'AUTH_INVALID_CREDENTIALS'
        ? t('auth.invalidLogin')
        : error?.message && error?.message !== 'Unexpected error'
          ? error.message
          : t('common.errorGeneric');
  return (
    <div className="state" role="alert">
      <div className="icon" aria-hidden><Icon name="alertTriangle" size={30} /></div>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-outline btn-sm" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  const { t } = useI18n();
  return (
    <div className="state card">
      <div className="icon" aria-hidden><Icon name="wheat" size={30} /></div>
      <p style={{ fontWeight: 600 }}>{title || t('common.empty')}</p>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}
