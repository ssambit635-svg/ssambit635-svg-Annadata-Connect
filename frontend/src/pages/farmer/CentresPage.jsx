import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { centreService } from '../../services/api/farmerService.js';
import { Loading, ErrorState, EmptyState } from '../../components/States.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import Icon from '../../components/Icon.jsx';

// Public procurement-centre listing with live queue/storage state.
export default function CentresPage() {
  const { t, pick } = useI18n();
  const { data, error, loading, reload } = usePoll(() => centreService.list(), { intervalMs: 30000 });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <h1>{t('farmer.centresTitle')}</h1>
      {data.centres.length === 0 && <EmptyState title={t('farmer.noCentres')} />}
      <div className="grid two">
        {data.centres.map((c) => {
          const storageLeft = c.capacityQuintals - c.currentStockQuintals;
          const barCls = c.capacityPct >= 90 ? 'bad' : c.capacityPct >= 75 ? 'warn' : '';
          return (
            <div className="card" key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{pick(c, 'name')}</h2>
                <StatusBadge status={c.status} />
              </div>
              <p style={{ color: 'var(--c-text-soft)', fontSize: '0.9rem', margin: '0.35rem 0' }}>
                <Icon name="pin" size={14} /> {c.address} · <Icon name="clock" size={14} /> {c.operatingHours}
              </p>
              <div className="grid stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="stat"><div className="num">{c.queue.waiting}</div><div className="lbl">{t('farmer.farmersWaiting')}</div></div>
                <div className="stat"><div className="num">{storageLeft}</div><div className="lbl">{t('farmer.storageLeft')} ({t('common.quintalShort')})</div></div>
              </div>
              <div style={{ marginTop: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--c-text-soft)' }}>
                  <span>{t('farmer.capacity')}</span>
                  <span>{c.capacityPct}%</span>
                </div>
                <div className={`bar ${barCls}`}><span style={{ width: `${c.capacityPct}%` }} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
