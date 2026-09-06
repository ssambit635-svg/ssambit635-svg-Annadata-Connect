// Procurement centres — live queue & storage state per centre.
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { centreService } from '../../services/api/farmerService.js';
import Icon from '../../components/Icon.jsx';
import { ArtMandi, ArtCow } from '../art.jsx';
import { MCard, MStat, MBar, MLoader, MError, MEmpty, MBadge, SectionH } from '../ui.jsx';

export default function Centres() {
  const { t, pick } = useI18n();
  const { data, error, loading, reload } = usePoll(() => centreService.list(), { intervalMs: 30000 });

  if (loading) return <MLoader />;
  if (error) return <MError error={error} onRetry={reload} />;

  return (
    <div className="m-stagger">
      <SectionH title={t('farmer.centresTitle')} art={<ArtMandi size={34} />} />

      {data.centres.length === 0 ? (
        <MEmpty art={<ArtCow size={90} className="m-anim-bob" />} title={t('farmer.noCentres')} />
      ) : (
        data.centres.map((c) => {
          const storageLeft = c.capacityQuintals - c.currentStockQuintals;
          return (
            <MCard key={c.id} plain>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h3 style={{ fontSize: 17.5, fontFamily: 'var(--m-f-display)' }}>{pick(c, 'name')}</h3>
                <MBadge status={c.status} />
              </div>
              <div className="m-kv" style={{ marginTop: 4 }}>
                <Icon name="pin" size={16} />
                <span>{c.address}</span>
              </div>
              <div className="m-kv">
                <Icon name="clock" size={16} />
                <span>{c.operatingHours}</span>
              </div>

              <div className="m-stat-grid" style={{ marginTop: 10 }}>
                <MStat num={c.queue.waiting} label={t('farmer.farmersWaiting')} tone="warning" />
                <MStat num={storageLeft} label={`${t('farmer.storageLeft')} (${t('common.quintalShort')})`} />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--m-ink-soft)', fontWeight: 700, marginBottom: 5 }}>
                  <span>{t('farmer.capacity')}</span>
                  <span>{c.capacityPct}%</span>
                </div>
                <MBar pct={c.capacityPct} />
              </div>
            </MCard>
          );
        })
      )}
    </div>
  );
}
