import { useI18n } from '../i18n/I18nContext.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { waitText } from '../utils/format.js';

// Big, readable token card — readable at arm's length on a small phone.
export function TokenCard({ request, queue }) {
  const { t, pick } = useI18n();
  if (!request) return null;
  return (
    <div className="token-card">
      <div className="token-label">{t('farmer.yourToken').toUpperCase()}</div>
      <div className="token-number">{request.tokenNumber}</div>
      <div style={{ marginBottom: '0.75rem' }}>
        <StatusBadge status={request.status} />
      </div>
      <div className="rows">
        <div className="cell">
          <div className="k">{t('farmer.queuePosition')}</div>
          <div className="v">{queue?.inQueue ? `#${queue.position}` : '—'}</div>
        </div>
        <div className="cell">
          <div className="k">{t('farmer.estimatedWait')}</div>
          <div className="v">{queue?.inQueue ? waitText(queue.estimatedWaitMinutes, t) : '—'}</div>
        </div>
        <div className="cell">
          <div className="k">{t('farmer.crop')}</div>
          <div className="v" style={{ fontSize: '1rem' }}>{pick(request.crop, 'name')}</div>
        </div>
        <div className="cell">
          <div className="k">{t('farmer.quantity')}</div>
          <div className="v">
            {request.quantityQuintals} {t('common.quintalShort')}
          </div>
        </div>
      </div>
      <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', color: 'var(--c-text-soft)' }}>
        {t('farmer.centre')}: {pick(request.centre, 'name')}
      </p>
    </div>
  );
}
