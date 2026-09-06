import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { authorityService } from '../../services/api/farmerService.js';
import { Loading, ErrorState } from '../../components/States.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import Icon from '../../components/Icon.jsx';
import { formatInr } from '../../utils/format.js';

// District-level oversight: demand, congestion, capacity, volume — all derived
// from real per-centre data (no decorative charts).
export default function AuthorityDashboard() {
  const { t, pick } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(() => authorityService.overview(), { intervalMs: 15000 });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { district, totals, centres } = data;
  const maxWaiting = Math.max(...centres.map((c) => c.stats.waiting), 1);
  const maxDemand = Math.max(...centres.map((c) => c.stats.farmersToday), 1);
  const alertCentres = centres.filter((c) => c.alerts.length > 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 0 }}>{t('authority.overview')}</h1>
          <p style={{ margin: 0, color: 'var(--c-text-soft)' }}>{t('authority.district')}: {district}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link className="btn btn-primary" to="/authority/simulator"><Icon name="activity" size={15} /> {t('simulator.title')}</Link>
          <button className="btn btn-outline btn-sm" onClick={reload} disabled={refreshing}><Icon name="refresh" size={14} /> {t('common.refresh')}</button>
        </div>
      </div>

      <Link to="/authority/simulator" className="sim-hero sim-hero-link" style={{ textDecoration: 'none' }}>
        <Icon name="activity" size={17} />
        <span>{t('simulator.title')} — {t('simulator.blurb')}</span>
        <Icon name="arrowUpRight" size={16} style={{ flexShrink: 0, color: 'var(--c-primary)' }} />
      </Link>

      <div className="grid stats" style={{ marginBottom: '1rem' }}>
        <div className="stat"><div className="num">{totals.farmersToday}</div><div className="lbl">{t('authority.totalFarmersToday')}</div></div>
        <div className="stat warn"><div className="num">{totals.waiting}</div><div className="lbl">{t('authority.totalWaiting')}</div></div>
        <div className="stat ok"><div className="num">{totals.completed}</div><div className="lbl">{t('authority.totalCompleted')}</div></div>
        <div className="stat info"><div className="num">{totals.procuredQuintals}</div><div className="lbl">{t('authority.totalProcured')} ({t('common.quintalShort')})</div></div>
        <div className="stat"><div className="num">{totals.openCentres}/{totals.totalCentres}</div><div className="lbl">{t('authority.centresOpen')}</div></div>
      </div>

      <div className="grid two">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('authority.queueCongestion')}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--c-text-soft)' }}>{t('authority.congestionNote')}</p>
          {centres.map((c) => (
            <div className="bar-row" key={c.id}>
              <span>{pick(c, 'name')}</span>
              <div className={`bar ${c.stats.waiting >= 10 ? 'warn' : ''}`}><span style={{ width: `${(c.stats.waiting / maxWaiting) * 100}%` }} /></div>
              <span className="mono">{c.stats.waiting}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('officer.capacity')}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--c-text-soft)' }}>{t('authority.capacityNote')}</p>
          {centres.map((c) => (
            <div className="bar-row" key={c.id}>
              <span>{pick(c, 'name')}</span>
              <div className={`bar ${c.capacityPct >= 90 ? 'bad' : c.capacityPct >= 75 ? 'warn' : ''}`}><span style={{ width: `${c.capacityPct}%` }} /></div>
              <span className="mono">{c.capacityPct}%</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('authority.demand')}</h2>
          {centres.map((c) => (
            <div className="bar-row" key={c.id}>
              <span>{pick(c, 'name')}</span>
              <div className="bar blue"><span style={{ width: `${(c.stats.farmersToday / maxDemand) * 100}%` }} /></div>
              <span className="mono">{c.stats.farmersToday}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('authority.alertsCol')}</h2>
          {alertCentres.length === 0 ? (
            <p style={{ color: 'var(--c-text-soft)' }}><Icon name="checkCircle" size={17} /> {t('officer.noAlerts')}</p>
          ) : (
            <ul className="alert-list">
              {alertCentres.flatMap((c) =>
                c.alerts.map((a) => (
                  <li key={c.id + a.code} className={a.level}>
                    <span><strong>{pick(c, 'name')}</strong> — {pick(a, 'message')}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      <p style={{ color: 'var(--c-text-soft)', fontSize: '0.9rem', marginTop: '0.5rem' }}><><Icon name="info" size={15} /> {t('authority.clickCentre')}</></p>
      <div className="table-wrap" style={{ marginTop: '0.25rem' }}>
        <table className="data">
          <thead>
            <tr>
              <th>{t('authority.centreCol')}</th>
              <th>{t('officer.centreStatus')}</th>
              <th>{t('officer.farmersToday')}</th>
              <th>{t('officer.waiting')}</th>
              <th>{t('officer.processing')}</th>
              <th>{t('officer.completed')}</th>
              <th>{t('authority.volumeCol')}</th>
              <th>{t('authority.valueCol')}</th>
              <th>{t('authority.paidCol')}</th>
              <th>{t('officer.capacity')}</th>
            </tr>
          </thead>
          <tbody>
            {centres.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/authority/centres/${c.id}`}>{pick(c, 'name')} →</Link></td>
                <td><StatusBadge status={c.status} /></td>
                <td className="mono">{c.stats.farmersToday}</td>
                <td className="mono">{c.stats.waiting}</td>
                <td className="mono">{c.stats.called + c.stats.processing}</td>
                <td className="mono">{c.stats.completed}</td>
                <td className="mono">{c.procuredQuintals}</td>
                <td className="mono">{formatInr(c.procuredValueInr)}</td>
                <td className="mono">{formatInr(c.paidValueInr)}</td>
                <td className="mono">{c.capacityPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
