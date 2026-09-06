// Procurement journey — a friendly vertical timeline of the token's life.
import { useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { requestService } from '../../services/api/farmerService.js';
import { formatDate } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtTractor, ArtField } from '../art.jsx';
import { MCard, MLoader, MError, Journey, MBadge, MBtn } from '../ui.jsx';

export default function Status() {
  const { id } = useParams();
  const { t, lang, pick } = useI18n();
  const { data, error, loading, reload } = usePoll(() => requestService.get(id), { intervalMs: 10000, deps: [id] });

  if (loading) return <MLoader />;
  if (error) return <MError error={error} onRetry={reload} />;

  const { request } = data;
  const terminal = ['CANCELLED', 'REJECTED'].includes(request.status);

  return (
    <div className="m-stagger">
      <MCard plain className={terminal ? '' : 'green'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span className="m-display" style={{ fontSize: 26, fontWeight: 800, color: terminal ? 'var(--m-green-forest)' : '#fff' }}>
            {request.tokenNumber}
          </span>
          <MBadge status={request.status} />
        </div>
        <p style={{ fontSize: 14, color: terminal ? 'var(--m-ink-soft)' : '#cfe2cd', marginTop: 6 }}>
          {pick(request.crop, 'name')} · {request.quantityQuintals} {t('common.quintal')} · {pick(request.centre, 'name')}
        </p>
        <p style={{ fontSize: 12.5, color: terminal ? 'var(--m-ink-faint)' : '#9fbba1', marginTop: 4 }}>
          {t('farmer.lastUpdated')}: {formatDate(request.updatedAt, lang)}
        </p>
      </MCard>

      {terminal && <div className="m-banner error"><Icon name="alertOctagon" size={17} />{t('farmer.cancelledBadge')}</div>}

      <MCard plain>
        {request.status === 'COMPLETED' ? (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <ArtField size={180} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <ArtTractor size={110} />
          </div>
        )}
        <Journey request={request} />
      </MCard>

      <div className="m-btn-row">
        {!terminal && (
          <MBtn to={`/requests/${id}`} variant="primary" icon={<Icon name="ticket" size={17} />}>{t('farmer.viewToken')}</MBtn>
        )}
        <MBtn to="/farmer" variant="soft">{t('nav.dashboard')}</MBtn>
      </div>
    </div>
  );
}
