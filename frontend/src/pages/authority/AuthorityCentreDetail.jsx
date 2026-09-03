import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { authorityService } from '../../services/api/farmerService.js';
import { Loading, ErrorState } from '../../components/States.jsx';
import { StatusBadge, PaymentBadge } from '../../components/StatusBadge.jsx';
import Icon from '../../components/Icon.jsx';
import { formatDate, formatInr } from '../../utils/format.js';

// Full per-centre drill-down for the authority: live stats, storage, alerts,
// and the recent request register incl. payment state — from the backend only.
export default function AuthorityCentreDetail() {
  const { id } = useParams();
  const { t, pick, lang } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(() => authorityService.centre(id), { intervalMs: 15000, deps: [id] });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { centre, stats, alerts, recentRequests } = data;
  const barCls = centre.capacityPct >= 90 ? 'bad' : centre.capacityPct >= 75 ? 'warn' : '';

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 0 }}>{pick(centre, 'name')}</h1>
          <p style={{ margin: 0, color: 'var(--c-text-soft)' }}>
            <Icon name="pin" size={15} /> {centre.address} · <Icon name="clock" size={15} /> {centre.operatingHours} · <StatusBadge status={centre.status} />
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={reload} disabled={refreshing}><Icon name="refresh" size={14} /> {t('common.refresh')}</button>
          <Link className="btn btn-outline btn-sm" to="/authority">← {t('authority.overview')}</Link>
        </div>
      </div>

      <div className="grid stats" style={{ marginBottom: '1rem' }}>
        <div className="stat"><div className="num">{stats.farmersToday}</div><div className="lbl">{t('officer.farmersToday')}</div></div>
        <div className="stat warn"><div className="num">{stats.waiting}</div><div className="lbl">{t('officer.waiting')}</div></div>
        <div className="stat info"><div className="num">{stats.called + stats.processing}</div><div className="lbl">{t('officer.processing')}</div></div>
        <div className="stat ok"><div className="num">{stats.completed}</div><div className="lbl">{t('officer.completed')}</div></div>
        <div className="stat"><div className="num">{centre.capacityPct}%</div><div className="lbl">{t('officer.capacity')}</div></div>
      </div>

      <div className="grid two" style={{ marginBottom: '1rem' }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('officer.storage')}</h2>
          <div className={`bar ${barCls}`}><span style={{ width: `${centre.capacityPct}%` }} /></div>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--c-text-soft)' }}>
            {centre.currentStockQuintals} / {centre.capacityQuintals} {t('officer.stockOf')}
          </p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('officer.alerts')}</h2>
          {alerts.length === 0 ? (
            <p className="ok-line" style={{ margin: 0 }}><Icon name="checkCircle" size={17} /> {t('officer.noAlerts')}</p>
          ) : (
            <ul className="alert-list">
              {alerts.map((a) => (
                <li key={a.code} className={a.level}>{pick(a, 'message')}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h2>{t('authority.recentRequests')}</h2>
      {recentRequests.length === 0 ? (
        <div className="card state">{t('officer.noPending')}</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('officer.token')}</th>
                <th>{t('officer.farmerCol')}</th>
                <th>{t('officer.cropCol')}</th>
                <th>{t('officer.qtyCol')}</th>
                <th>{t('farmer.procurementCol')}</th>
                <th>{t('farmer.paymentCol')}</th>
                <th>{t('authority.valueCol')}</th>
                <th>{t('common.today')}</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.tokenNumber}</td>
                  <td>{r.farmer?.name}</td>
                  <td>{pick(r.crop, 'name')}</td>
                  <td>{r.quantityQuintals} {t('common.quintalShort')}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><PaymentBadge payment={r.payment} /></td>
                  <td>{formatInr(r.payment ? r.payment.amountInr : r.estimatedValueInr)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.createdAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
