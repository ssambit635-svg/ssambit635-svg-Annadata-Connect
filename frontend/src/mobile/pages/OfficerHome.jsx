// Officer home — centre control room: live stats, intake toggle,
// serving counter, payments to settle, alerts, SMS outbox.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { officerService } from '../../services/api/farmerService.js';
import { formatInr, formatDate } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtQueue, ArtScales, ArtMandi } from '../art.jsx';
import { MCard, MStat, MBar, MLoader, MError, MEmpty, MBadge, MBtn, MConfirm, Sheet, MField, MInput, SectionH } from '../ui.jsx';

export default function OfficerHome() {
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
  const [toggleOpen, setToggleOpen] = useState(false);
  const [payFor, setPayFor] = useState(null);
  const [ref, setRef] = useState('');

  if (loading) return <MLoader />;
  if (error) return <MError error={error} onRetry={reload} />;

  const { centre, stats, alerts, serving, nextWaiting, payments, pendingPayments, smsLog, smsProvider } = data;

  async function quick(id, action) {
    setBusy(true);
    try {
      await officerService.updateStatus(id, action);
      await reload();
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function markPaid() {
    setBusy(true);
    try {
      await officerService.markPaid(payFor.id, ref);
      setPayFor(null);
      setRef('');
      await reload();
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleCentre() {
    setBusy(true);
    try {
      await officerService.setCentreStatus(centre.status === 'OPEN' ? 'PAUSED' : 'OPEN');
      setToggleOpen(false);
      await reload();
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="m-stagger">
      {/* ── centre header ── */}
      <MCard plain className="green m-centre-card">
        <div className="m-centre-top">
          <span className="m-centre-mark"><ArtMandi size={40} className="m-anim-pop" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="m-eyebrow" style={{ color: 'var(--m-gold-bright)' }}>{t('officer.centreStatus')} · {centre.district}</div>
            <h2 className="m-centre-name">{pick(centre, 'name')}</h2>
            <p className="m-centre-sub">
              <Icon name="pin" size={13} /> {centre.address}
              <span aria-hidden="true"> · </span>
              <Icon name="clock" size={13} /> {centre.operatingHours}
            </p>
          </div>
          <MBadge status={centre.status} />
        </div>
        <div className="m-btn-row" style={{ marginTop: 16 }}>
          <MBtn variant="white" size="sm" onClick={reload} disabled={refreshing} icon={<Icon name="refresh" size={15} />}>{t('common.refresh')}</MBtn>
          <MBtn variant="gold" size="sm" onClick={() => setToggleOpen(true)} disabled={busy}>
            {centre.status === 'OPEN' ? t('officer.pauseIntake') : t('officer.resumeIntake')}
          </MBtn>
        </div>
      </MCard>

      {centre.status !== 'OPEN' && <div className="m-banner warning"><Icon name="alertTriangle" size={17} />{t('officer.intakePaused')}</div>}

      {/* ── stats ── */}
      <SectionH title={t('officer.shiftTitle')} hint={<span className="m-live">{t('officer.liveTelemetry')}</span>} />
      <div className="m-stat-grid m-stat-grid-2">
        <MStat num={stats.farmersToday} label={t('officer.farmersToday')} />
        <MStat num={stats.waiting} label={t('officer.waiting')} tone="warning" />
        <MStat num={stats.called + stats.processing} label={t('officer.processing')} tone="info" />
        <MStat num={stats.completed} label={t('officer.completed')} />
        <MStat num={`${stats.capacityPct}%`} label={t('officer.capacity')} />
        <MStat num={formatInr(payments.pendingAmountInr)} label={`${t('officer.paymentsPending')} · ${payments.pendingCount}`} tone="warning" />
      </div>

      {/* ── storage ── */}
      <MCard plain>
        <div className="m-card-h m-card-h-split">
          <span><Icon name="store" size={19} /> {t('officer.storage')}</span>
          <span className="m-card-h-val">{stats.capacityPct}%</span>
        </div>
        <MBar pct={stats.capacityPct} tone={stats.capacityPct >= 90 ? 'bad' : stats.capacityPct >= 75 ? 'warn' : undefined} />
        <p style={{ fontSize: 13, color: 'var(--m-ink-soft)', marginTop: 10 }}>
          <strong style={{ color: 'var(--m-green-forest)' }}>{centre.currentStockQuintals.toLocaleString('en-IN')}</strong> / {centre.capacityQuintals.toLocaleString('en-IN')} {t('officer.stockOf')}
        </p>
      </MCard>

      {/* ── serving now ── */}
      <SectionH title={t('officer.servingNow')} art={<ArtQueue size={38} />} />
      {serving.length === 0 ? (
        <MCard plain><p style={{ color: 'var(--m-ink-faint)', fontSize: 14 }}>{t('officer.noPending')}</p></MCard>
      ) : (
        serving.map((r) => (
          <div key={r.id} className={`m-token-card ${r.status === 'PROCESSING' ? 'is-processing' : 'is-called'}`}>
            <div className="m-token-card-top">
              <span className="m-token-chip">{r.tokenNumber}</span>
              <MBadge status={r.status} />
            </div>
            <div className="m-token-card-name">{r.farmer?.name}</div>
            <div className="m-token-card-sub">{pick(r.crop, 'name')} · {r.quantityQuintals} {t('common.quintalShort')} · {formatInr(r.estimatedValueInr)}</div>
            <div className="m-token-card-actions">
              {r.status === 'CALLED' && (
                <MBtn block variant="primary" disabled={busy} onClick={() => quick(r.id, 'START')} iconRight={<Icon name="arrowUpRight" size={16} />}>{t('officer.start')}</MBtn>
              )}
              {r.status === 'PROCESSING' && (
                <MBtn block variant="gold" disabled={busy} onClick={() => quick(r.id, 'COMPLETE')} icon={<Icon name="check" size={16} strokeWidth={2.8} />}>
                  {t('officer.complete')}
                </MBtn>
              )}
            </div>
          </div>
        ))
      )}

      {/* ── payments to settle ── */}
      <SectionH title={t('officer.paymentsToSettle')} art={<ArtScales size={30} />} />
      <MCard plain>
        {pendingPayments.length === 0 ? (
          <p style={{ color: 'var(--m-ink-faint)', fontSize: 14 }}><Icon name="checkCircle" size={15} /> {t('officer.settleAllDone')}</p>
        ) : (
          pendingPayments.slice(0, 6).map((r) => (
            <div key={r.id} className="m-row" style={{ marginBottom: 10 }}>
              <span className="m-row-ico gold"><Icon name="rupee" size={18} /></span>
              <div className="m-row-main">
                <div className="m-row-title">{r.farmer?.name}</div>
                <div className="m-row-sub"><span className="m-token-mini">{r.tokenNumber}</span> {pick(r.crop, 'name')} · <strong>{formatInr(r.payment.amountInr)}</strong></div>
              </div>
              <MBtn
                size="sm"
                variant="primary"
                disabled={busy}
                onClick={() => { setPayFor(r); setRef(''); }}
              >
                {t('officer.markPaid')}
              </MBtn>
            </div>
          ))
        )}
        {pendingPayments.length > 6 && (
          <Link to="/officer/requests" className="text-button" style={{ fontWeight: 700 }}>{t('common.viewAll')} →</Link>
        )}
      </MCard>

      {/* ── next in line ── */}
      <SectionH title={t('officer.nextInLine')} hint={<Link to="/officer/queue" style={{ fontSize: 12.5, fontWeight: 700 }}>{t('common.viewAll')} →</Link>} />
      <MCard plain>
        {nextWaiting.length === 0 ? (
          <p style={{ color: 'var(--m-ink-faint)', fontSize: 14 }}>{t('officer.noPending')}</p>
        ) : (
          nextWaiting.slice(0, 5).map((r, i) => (
            <div key={r.id} className="m-queue-line">
              <span className="m-queue-pos">{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="m-queue-name">{r.farmer?.name}</div>
                <div className="m-queue-sub"><span className="m-token-mini">{r.tokenNumber}</span> {pick(r.crop, 'name')} · {r.quantityQuintals} {t('common.quintalShort')}</div>
              </div>
              <MBtn size="sm" variant="soft" disabled={busy} onClick={() => quick(r.id, 'CALL')}>
                <Icon name="megaphone" size={14} /> {t('officer.call')}
              </MBtn>
            </div>
          ))
        )}
      </MCard>

      {/* ── alerts ── */}
      <MCard plain>
        <div className="m-card-h"><Icon name="alertTriangle" size={19} /> {t('officer.alerts')}</div>
        {alerts.length === 0 ? (
          <p style={{ color: 'var(--m-ink-faint)', fontSize: 14 }}><Icon name="checkCircle" size={15} /> {t('officer.noAlerts')}</p>
        ) : (
          alerts.map((a) => (
            <div key={a.code} className={`m-banner ${a.level === 'critical' ? 'error' : a.level === 'warning' ? 'warning' : 'info'}`} style={{ marginBottom: 8 }}>
              <Icon name={a.level === 'critical' ? 'alertOctagon' : 'alertTriangle'} size={16} />
              {pick(a, 'message')}
            </div>
          ))
        )}
      </MCard>

      {/* ── sms outbox ── */}
      <MCard plain>
        <div className="m-card-h">
          <Icon name="mail" size={19} /> {t('officer.smsOutbox')}
          <span className="m-right">
            {smsProvider === 'sim'
              ? <MBadge tone="warning">{t('officer.smsSimulated')}</MBadge>
              : <MBadge tone="success">{smsProvider}</MBadge>}
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--m-ink-faint)', marginBottom: 8 }}>{t('officer.smsHint')}</p>
        {smsLog.length === 0 ? (
          <p style={{ color: 'var(--m-ink-faint)', fontSize: 14 }}>{t('officer.smsEmpty')}</p>
        ) : (
          smsLog.slice(0, 4).map((s) => (
            <div key={s.id} className="m-sms-line">
              <div style={{ fontSize: 13.5 }}>{s.text}</div>
              <div style={{ fontSize: 11.5, color: 'var(--m-ink-faint)', display: 'flex', gap: 8, marginTop: 2 }}>
                <span>{t('officer.smsTo')}: {s.to}</span>
                <span>· {formatDate(s.createdAt, lang)}</span>
                <MBadge tone={s.status === 'SENT' ? 'success' : s.status === 'SIMULATED' ? 'info' : 'neutral'}>{s.status}</MBadge>
              </div>
            </div>
          ))
        )}
      </MCard>

      {/* ── sheets ── */}
      <MConfirm
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        onConfirm={toggleCentre}
        title={centre.status === 'OPEN' ? t('officer.pauseIntake') : t('officer.resumeIntake')}
        sub={pick(centre, 'name')}
        confirmLabel={t('common.confirm')}
        danger={centre.status === 'OPEN'}
        busy={busy}
      />

      <Sheet open={Boolean(payFor)} onClose={() => setPayFor(null)} title={t('officer.markPaid')} sub={payFor ? `${payFor.tokenNumber} · ${payFor.farmer?.name} · ${formatInr(payFor.payment.amountInr)}` : ''}>
        <MField label={t('officer.refPlaceholder')} htmlFor="pay-ref">
          <MInput id="pay-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UTR…" autoFocus />
        </MField>
        <div className="m-btn-row">
          <MBtn variant="soft" onClick={() => setPayFor(null)}>{t('common.cancel')}</MBtn>
          <MBtn variant="primary" onClick={markPaid} disabled={busy} icon={<Icon name="rupee" size={17} />}>{t('common.confirm')}</MBtn>
        </div>
      </Sheet>
    </div>
  );
}
