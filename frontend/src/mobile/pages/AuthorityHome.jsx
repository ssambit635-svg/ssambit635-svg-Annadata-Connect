// District oversight — demand, congestion, capacity and alerts across
// every centre, in a phone-friendly stack.
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { officerService } from '../../services/api/farmerService.js';
import { authorityService } from '../../services/api/farmerService.js';
import { formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtField, ArtMandi } from '../art.jsx';
import { MCard, MStat, MBar, MLoader, MError, MBadge, SectionH } from '../ui.jsx';

export default function AuthorityHome() {
  const { t, pick } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(() => authorityService.overview(), { intervalMs: 15000 });

  if (loading) return <MLoader />;
  if (error) return <MError error={error} onRetry={reload} />;

  const { district, totals, centres } = data;
  const alertCentres = centres.filter((c) => c.alerts.length > 0);

  return (
    <div className="m-stagger">
      <MCard plain className="green">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ArtField size={130} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 19, color: '#fff', fontFamily: 'var(--m-f-display)' }}>{t('authority.overview')}</h2>
            <p style={{ fontSize: 13, color: '#cfe2cd' }}>{t('authority.district')}: {district}</p>
            <button type="button" className="m-chip" style={{ marginTop: 8, borderColor: 'rgba(255,255,255,.35)', color: '#cfe2cd', background: 'transparent' }} onClick={reload} disabled={refreshing}>
              <Icon name="refresh" size={14} /> {t('common.refresh')}
            </button>
          </div>
        </div>
      </MCard>

      <div className="m-stat-grid">
        <MStat num={totals.farmersToday} label={t('authority.totalFarmersToday')} />
        <MStat num={totals.waiting} label={t('authority.totalWaiting')} tone="warning" />
        <MStat num={totals.completed} label={t('authority.totalCompleted')} />
        <MStat num={totals.procuredQuintals} label={`${t('authority.totalProcured')} (${t('common.quintalShort')})`} tone="info" />
        <MStat num={`${totals.openCentres}/${totals.totalCentres}`} label={t('authority.centresOpen')} className="gold" />
      </div>

      {/* Procurement Simulator module entry */}
      <Link to="/authority/simulator" style={{ textDecoration: 'none' }}>
        <div className="m-row" style={{ borderLeft: '3px solid var(--m-gold)', background: 'var(--m-paper)' }}>
          <span className="m-row-ico" style={{ color: 'var(--m-green-deep)' }}><Icon name="activity" size={20} /></span>
          <div className="m-row-main">
            <div className="m-row-title">{t('simulator.title')}</div>
            <div className="m-row-sub">{t('simulator.subtitle')}</div>
          </div>
          <Icon name="arrowUpRight" size={18} style={{ color: 'var(--m-ink-faint)' }} />
        </div>
      </Link>

      {/* ── congestion ── */}
      <MCard plain>
        <div className="m-card-h"><Icon name="users" size={19} /> {t('authority.queueCongestion')}</div>
        <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', marginBottom: 6 }}>{t('authority.congestionNote')}</p>
        {centres.map((c) => (
          <div key={c.id} className="m-bar-row">
            <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pick(c, 'name')}</span>
            <MBar pct={(c.stats.waiting / Math.max(...centres.map((x) => x.stats.waiting), 1)) * 100} tone="warn" height={10} />
            <span className="m-bar-val">{c.stats.waiting}</span>
          </div>
        ))}
      </MCard>

      {/* ── capacity ── */}
      <MCard plain>
        <div className="m-card-h"><Icon name="store" size={19} /> {t('officer.capacity')}</div>
        <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', marginBottom: 6 }}>{t('authority.capacityNote')}</p>
        {centres.map((c) => (
          <div key={c.id} className="m-bar-row">
            <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pick(c, 'name')}</span>
            <MBar pct={c.capacityPct} height={10} />
            <span className="m-bar-val">{c.capacityPct}%</span>
          </div>
        ))}
      </MCard>

      {/* ── alerts ── */}
      {alertCentres.length > 0 && (
        <MCard plain>
          <div className="m-card-h"><Icon name="alertTriangle" size={19} /> {t('authority.alertsCol')}</div>
          {alertCentres.flatMap((c) =>
            c.alerts.map((a) => (
              <div key={c.id + a.code} className={`m-banner ${a.level === 'critical' ? 'error' : a.level === 'warning' ? 'warning' : 'info'}`} style={{ marginBottom: 8 }}>
                <Icon name={a.level === 'critical' ? 'alertOctagon' : 'alertTriangle'} size={16} />
                <span><strong>{pick(c, 'name')}</strong> — {pick(a, 'message')}</span>
              </div>
            ))
          )}
        </MCard>
      )}

      {/* ── centre cards ── */}
      <SectionH title={t('authority.centreWise')} art={<ArtMandi size={30} />} />
      {centres.map((c) => (
        <Link key={c.id} to={`/authority/centres/${c.id}`} style={{ textDecoration: 'none' }}>
          <div className="m-row">
            <span className={`m-row-ico ${c.status === 'OPEN' ? '' : 'gold'}`}><Icon name="store" size={20} /></span>
            <div className="m-row-main">
              <div className="m-row-title">{pick(c, 'name')} <MBadge status={c.status} /></div>
              <div className="m-row-sub">
                {t('officer.farmersToday')}: {c.stats.farmersToday} · {t('officer.waiting')}: {c.stats.waiting} · {t('officer.completed')}: {c.stats.completed}
              </div>
              <div className="m-row-sub">
                {t('authority.volumeCol')}: {c.procuredQuintals}{t('common.quintalShort')} · {formatInr(c.procuredValueInr)}
              </div>
            </div>
            <Icon name="arrowUpRight" size={18} style={{ color: 'var(--m-ink-faint)' }} />
          </div>
        </Link>
      ))}
      <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', textAlign: 'center' }}>{t('authority.clickCentre')}</p>
    </div>
  );
}
