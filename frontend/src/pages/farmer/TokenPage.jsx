import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import Icon from '../../components/Icon.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { requestService } from '../../services/api/farmerService.js';
import { Loading, ErrorState } from '../../components/States.jsx';
import { TokenCard } from '../../components/TokenCard.jsx';
import { PaymentBadge } from '../../components/StatusBadge.jsx';
import { formatDate, formatInr } from '../../utils/format.js';

export default function TokenPage() {
  const { id } = useParams();
  const { t, pick, lang } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(() => requestService.get(id), { intervalMs: 8000, deps: [id] });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { request, queue } = data;

  return (
    <div className="page narrow" style={{ margin: '0 auto', padding: 0 }}>
      <div className="page-head">
        <h1>{t('farmer.yourToken')}</h1>
        <button className="btn btn-outline btn-sm" onClick={reload} disabled={refreshing}>
          <Icon name="refresh" size={14} /> {t('common.refresh')}
        </button>
      </div>

      <TokenCard request={request} queue={queue} />

      {request.status === 'CALLED' && (
        <div className="form-banner" style={{ background: 'var(--c-info-bg)', color: 'var(--c-info)', border: '1px solid #bcd0f5', fontWeight: 700, textAlign: 'center' }}>
          <><Icon name="megaphone" size={15} /> {t('status.CALLED')}: {request.centre && request.tokenNumber}</>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t('farmer.crop')} / {t('farmer.quantity')}</h2>
        <p>
          <Icon name="wheat" size={16} /> {pick(request.crop, 'name')} — {request.quantityQuintals} {t('common.quintal')}
          <br />
          <Icon name="card" size={16} /> {t('farmer.estimatedValue')}: <strong>{formatInr(request.estimatedValueInr)}</strong>
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t('farmer.payment.title')}</h2>
        {request.payment ? (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <PaymentBadge payment={request.payment} />
            <strong style={{ fontSize: '1.15rem' }}>{formatInr(request.payment.amountInr)}</strong>
            {request.payment.status === 'PENDING' ? (
              <span style={{ color: 'var(--c-text-soft)' }}>{t('farmer.payment.processing')}</span>
            ) : (
              <span style={{ color: 'var(--c-text-soft)' }}>
                {t('farmer.payment.paidOn')}: {formatDate(request.payment.paidAt, lang)}
                {request.payment.reference ? ` · ${t('farmer.payment.ref')}: ${request.payment.reference}` : ''}
              </span>
            )}
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--c-text-soft)' }}>{t('farmer.payment.none')}</p>
        )}
      </div>

      {queue?.centreSummary && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('farmer.servingNow')}</h2>
          <div className="grid stats">
            <div className="stat warn"><div className="num">{queue.centreSummary.waiting}</div><div className="lbl">{t('officer.waiting')}</div></div>
            <div className="stat info"><div className="num">{queue.centreSummary.called + queue.centreSummary.processing}</div><div className="lbl">{t('officer.processing')}</div></div>
            <div className="stat ok"><div className="num">{queue.centreSummary.completed}</div><div className="lbl">{t('officer.completed')}</div></div>
          </div>
        </div>
      )}

      <Link className="btn btn-outline btn-block" to={`/requests/${id}/status`}>
        <Icon name="clipboard" size={16} /> {t('farmer.viewStatus')}
      </Link>
    </div>
  );
}
