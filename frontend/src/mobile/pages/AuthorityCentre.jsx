// Per-centre drill-down for the authority — stats, storage, alerts and
// the recent request register as cards.
import { useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { authorityService } from '../../services/api/farmerService.js';
import { formatDate, formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtMandi } from '../art.jsx';
import { MCard, MStat, MBar, MLoader, MError, MBadge, MPayBadge, SectionH } from '../ui.jsx';

export default function AuthorityCentre() {
  const { id } = useParams();
  const { t, pick, lang } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(() => authorityService.centre(id), { intervalMs: 15000, deps: [id] });

  if (loading) return <MLoader />;
  if (error) return <MError error={error} onRetry={reload} />;

  const { centre, stats, alerts, recentRequests } = data;

  return (
    <div className="m-stagger">
      <MCard plain className="green">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ArtMandi size={56} className="m-anim-pop" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 18, color: '#fff', fontFamily: 'var(--m-f-display)' }}>{pick(centre, 'name')}</h2>
            <p style={{ fontSize: 12.5, color: '#cfe2cd' }}>{centre.address} · {centre.operatingHours}</p>
          </div>
          <MBadge status={centre.status} />
        </div>
        <button type="button" className="m-chip" style={{ marginTop: 10, borderColor: 'rgba(255,255,255,.35)', color: '#cfe2cd', background: 'transparent' }} onClick={reload} disabled={refreshing}>
          <Icon name="refresh" size={14} /> {t('common.refresh')}
        </button>
      </MCard>

      <div className="m-stat-grid">
        <MStat num={stats.farmersToday} label={t('officer.farmersToday')} />
        <MStat num={stats.waiting} label={t('officer.waiting')} tone="warning" />
        <MStat num={stats.called + stats.processing} label={t('officer.processing')} tone="info" />
        <MStat num={stats.completed} label={t('officer.completed')} />
        <MStat num={`${centre.capacityPct}%`} label={t('officer.capacity')} />
      </div>

      <MCard plain>
        <div className="m-card-h"><Icon name="store" size={19} /> {t('officer.storage')}</div>
        <MBar pct={centre.capacityPct} />
        <p style={{ fontSize: 13.5, color: 'var(--m-ink-soft)', marginTop: 8 }}>
          {centre.currentStockQuintals} / {centre.capacityQuintals} {t('officer.stockOf')}
        </p>
      </MCard>

      <MCard plain>
        <div className="m-card-h"><Icon name="alertTriangle" size={19} /> {t('officer.alerts')}</div>
        {alerts.length === 0 ? (
          <p style={{ color: 'var(--m-ink-faint)', fontSize: 14 }}><Icon name="checkCircle" size={15} /> {t('officer.noAlerts')}</p>
        ) : (
          alerts.map((a) => (
            <div key={a.code} className={`m-banner ${a.level === 'critical' ? 'error' : a.level === 'warning' ? 'warning' : 'info'}`} style={{ marginBottom: 8 }}>
              <Icon name="alertTriangle" size={16} /> {pick(a, 'message')}
            </div>
          ))
        )}
      </MCard>

      <SectionH title={t('authority.recentRequests')} />
      {recentRequests.length === 0 ? (
        <p style={{ color: 'var(--m-ink-faint)', fontSize: 14, textAlign: 'center' }}>{t('officer.noPending')}</p>
      ) : (
        recentRequests.map((r) => (
          <div key={r.id} className="m-row">
            <span className="m-row-ico">{r.tokenNumber}</span>
            <div className="m-row-main">
              <div className="m-row-title">{r.farmer?.name} <MBadge status={r.status} /></div>
              <div className="m-row-sub">{pick(r.crop, 'name')} · {r.quantityQuintals}{t('common.quintalShort')} · {formatDate(r.createdAt, lang)}</div>
              <div style={{ marginTop: 4 }}><MPayBadge payment={r.payment} /></div>
            </div>
            <div className="m-row-side">
              <div className="m-row-amount">{formatInr(r.payment ? r.payment.amountInr : r.estimatedValueInr)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
