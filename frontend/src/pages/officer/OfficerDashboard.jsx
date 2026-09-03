import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { officerService } from '../../services/api/farmerService.js';
import { Loading, ErrorState } from '../../components/States.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { formatDate, formatInr } from '../../utils/format.js';
import { useState } from 'react';
import Icon from '../../components/Icon.jsx';

export default function OfficerDashboard() {
  const { t, pick, lang } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(
    async () => {
      const [dash, completed, sms] = await Promise.all([
        officerService.dashboard(),
        officerService.requests('COMPLETED'),
        officerService.smsLog(),
      ]);
      return {
        ...dash,
        pendingPayments: completed.requests.filter((r) => r.payment?.status === 'PENDING'),
        smsLog: sms.smsLog,
        smsProvider: sms.provider,
      };
    },
    { intervalMs: 10000 }
  );
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState('');
  const [payFor, setPayFor] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { centre, stats, alerts, serving, nextWaiting, payments, pendingPayments, smsLog, smsProvider } = data;

  async function quick(id, action) {
    setBusy(true);
    try {
      await officerService.updateStatus(id, action);
      await reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(id, reference) {
    setBusy(true);
    try {
      await officerService.markPaid(id, reference);
      setPayFor(null);
      setRef('');
      await reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleCentre() {
    setBusy(true);
    try {
      await officerService.setCentreStatus(centre.status === 'OPEN' ? 'PAUSED' : 'OPEN');
      await reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  const barCls = stats.capacityPct >= 90 ? 'bad' : stats.capacityPct >= 75 ? 'warn' : '';

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 0 }}>{t('officer.dashboard')}</h1>
          <p style={{ margin: 0, color: 'var(--c-text-soft)' }}>{pick(centre, 'name')} · {centre.operatingHours}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusBadge status={centre.status} />
          <button className="btn btn-outline btn-sm" onClick={reload} disabled={refreshing}><Icon name="refresh" size={14} /> {t('common.refresh')}</button>
          <button className="btn btn-danger btn-sm" onClick={toggleCentre} disabled={busy}>
            {centre.status === 'OPEN' ? (<><Icon name="ban" size={15} /> {t('officer.pauseIntake')}</>) : (<><Icon name="check" size={15} /> {t('officer.resumeIntake')}</>)}
          </button>
        </div>
      </div>

      {centre.status !== 'OPEN' && <div className="form-banner error">{t('officer.intakePaused')}</div>}

      <div className="grid stats" style={{ marginBottom: '1rem' }}>
        <div className="stat"><div className="num">{stats.farmersToday}</div><div className="lbl">{t('officer.farmersToday')}</div></div>
        <div className="stat warn"><div className="num">{stats.waiting}</div><div className="lbl">{t('officer.waiting')}</div></div>
        <div className="stat info"><div className="num">{stats.called + stats.processing}</div><div className="lbl">{t('officer.processing')}</div></div>
        <div className="stat ok"><div className="num">{stats.completed}</div><div className="lbl">{t('officer.completed')}</div></div>
        <div className="stat"><div className="num">{stats.capacityPct}%</div><div className="lbl">{t('officer.capacity')}</div></div>
        <div className="stat warn"><div className="num">{payments.pendingCount}</div><div className="lbl">{t('officer.paymentsPending')} · {formatInr(payments.pendingAmountInr)}</div></div>
      </div>

      <div className="grid two">
        <div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t('officer.storage')}</h2>
            <div className={`bar ${barCls}`}><span style={{ width: `${stats.capacityPct}%` }} /></div>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--c-text-soft)' }}>
              {centre.currentStockQuintals} / {centre.capacityQuintals} {t('officer.stockOf')}
            </p>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t('officer.alerts')}</h2>
            {alerts.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--c-text-soft)' }}><Icon name="checkCircle" size={16} /> {t('officer.noAlerts')}</p>
            ) : (
              <ul className="alert-list">
                {alerts.map((a) => (
                  <li key={a.code} className={a.level}><Icon name={a.level === 'critical' ? 'alertOctagon' : a.level === 'warning' ? 'alertTriangle' : 'info'} size={16} /> {pick(a, 'message')}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}><Icon name="rupee" size={18} /> {t('officer.paymentsToSettle')}</h2>
            {pendingPayments.length === 0 && <p style={{ color: 'var(--c-text-soft)', margin: 0 }}><Icon name="checkCircle" size={16} /> {t('officer.settleAllDone')}</p>}
            {pendingPayments.slice(0, 5).map((r) => (
              <div key={r.id} className="alt-row">
                <span>
                  <span className="mono">{r.tokenNumber}</span> · {r.farmer?.name} · {pick(r.crop, 'name')}
                  <strong style={{ marginLeft: '0.5rem' }}>{formatInr(r.payment.amountInr)}</strong>
                </span>
                {payFor === r.id ? (
                  <span style={{ display: 'inline-flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <input className="input" style={{ minHeight: 36, width: 150 }} placeholder={t('officer.refPlaceholder')} value={ref} onChange={(e) => setRef(e.target.value)} />
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => markPaid(r.id, ref)}>{t('common.confirm')}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setPayFor(null)}>{t('common.cancel')}</button>
                  </span>
                ) : (
                  <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => { setPayFor(r.id); setRef(''); }}>₹ {t('officer.markPaid')}</button>
                )}
              </div>
            ))}
            {pendingPayments.length > 5 && <Link to="/officer/requests">{t('common.viewAll')} →</Link>}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}><Icon name="mail" size={18} /> {t('officer.smsOutbox')}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--c-text-soft)', margin: '0 0 0.5rem' }}>
              {t('officer.smsHint')}{' '}
              {smsProvider === 'sim' ? (
                <span className="badge warning">{t('officer.smsSimulated')}</span>
              ) : (
                <span className="badge success">{t('officer.providerMode')}: {smsProvider}</span>
              )}
            </p>
            {smsLog.length === 0 && <p style={{ color: 'var(--c-text-soft)', margin: 0 }}>{t('officer.smsEmpty')}</p>}
            {smsLog.slice(0, 5).map((s) => (
              <div key={s.id} className="alt-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.95rem' }}>{s.text}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--c-text-soft)' }}>
                    {t('officer.smsTo')}: {s.to} · {formatDate(s.createdAt, lang)}
                  </div>
                </div>
                <span className={`badge ${s.status === 'SENT' ? 'success' : s.status === 'SIMULATED' ? 'info' : 'neutral'}`}>{s.status}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t('officer.servingNow')}</h2>
            {serving.length === 0 && <p style={{ color: 'var(--c-text-soft)', margin: 0 }}>{t('officer.noPending')}</p>}
            {serving.map((r) => (
              <div key={r.id} className="alt-row">
                <span><span className="mono">{r.tokenNumber}</span> · {r.farmer?.name} · {pick(r.crop, 'name')} {r.quantityQuintals}{t('common.quintalShort')}</span>
                <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <StatusBadge status={r.status} />
                  {r.status === 'CALLED' && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => quick(r.id, 'START')}>{t('officer.start')}</button>}
                  {r.status === 'PROCESSING' && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => quick(r.id, 'COMPLETE')}><Icon name="check" size={15} strokeWidth={2.6} /> {t('officer.complete')}</button>}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ marginTop: 0 }}>{t('officer.nextInLine')}</h2>
            <Link to="/officer/queue">{t('common.viewAll')} →</Link>
          </div>
          {nextWaiting.length === 0 && <p style={{ color: 'var(--c-text-soft)' }}>{t('officer.noPending')}</p>}
          {nextWaiting.map((r, i) => (
            <div key={r.id} className="alt-row">
              <span><strong>#{i + 1}</strong> <span className="mono">{r.tokenNumber}</span> · {r.farmer?.name} · {pick(r.crop, 'name')} {r.quantityQuintals}{t('common.quintalShort')}</span>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => quick(r.id, 'CALL')}><Icon name="megaphone" size={15} /> {t('officer.call')}</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link className="btn btn-outline" to="/officer/assisted"><Icon name="clipboard" size={16} /> {t('nav.assisted')}</Link>
            <Link className="btn btn-outline" to="/officer/requests"><Icon name="fileText" size={16} /> {t('officer.pendingRequests')}</Link>
          </div>
        </div>
      </div>
    </>
  );
}
