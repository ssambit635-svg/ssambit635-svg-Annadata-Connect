import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import Icon from '../../components/Icon.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { requestService } from '../../services/api/farmerService.js';
import { Loading, ErrorState } from '../../components/States.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { StatusJourney } from '../../components/StatusJourney.jsx';
import { formatDate } from '../../utils/format.js';

export default function StatusPage() {
  const { id } = useParams();
  const { t, lang, pick } = useI18n();
  const { data, error, loading, reload } = usePoll(() => requestService.get(id), { intervalMs: 10000, deps: [id] });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { request } = data;
  const terminal = ['CANCELLED', 'REJECTED'].includes(request.status);

  return (
    <div className="page narrow" style={{ margin: '0 auto', padding: 0 }}>
      <h1>{t('farmer.statusJourney')}</h1>
      <div className="card">
        <p style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="mono" style={{ fontSize: '1.25rem' }}>{request.tokenNumber}</span>
          <StatusBadge status={request.status} />
        </p>
        <p style={{ color: 'var(--c-text-soft)', margin: 0 }}>
          {pick(request.crop, 'name')} · {request.quantityQuintals} {t('common.quintal')} · {pick(request.centre, 'name')}
          <br />
          {t('farmer.lastUpdated')}: {formatDate(request.updatedAt, lang)}
        </p>
      </div>

      {terminal && (
        <div className="form-banner error">{t('farmer.cancelledBadge')}</div>
      )}

      <div className="card">
        <StatusJourney request={request} />
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {!terminal && (
          <Link className="btn btn-primary" to={`/requests/${id}`}>
            <Icon name="ticket" size={16} /> {t('farmer.viewToken')}
          </Link>
        )}
        <Link className="btn btn-outline" to="/">
          ← {t('nav.dashboard')}
        </Link>
      </div>
    </div>
  );
}
