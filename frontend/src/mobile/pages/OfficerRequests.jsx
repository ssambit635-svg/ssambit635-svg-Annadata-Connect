// All requests with filters — status actions and payment settling.
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { officerService } from '../../services/api/farmerService.js';
import { formatDate, formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { MCard, MLoader, MError, MEmpty, MBadge, MPayBadge, MBtn, MBar, Sheet, MField, MInput } from '../ui.jsx';

const FILTERS = ['', 'WAITING', 'CALLED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED'];

export default function OfficerRequests() {
  const { t, pick, lang } = useI18n();
  const [filter, setFilter] = useState('');
  const { data, error, loading, reload } = usePoll(() => officerService.requests(filter), { intervalMs: 15000, deps: [filter] });
  const [busyId, setBusyId] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [note, setNote] = useState('');
  const [payFor, setPayFor] = useState(null);
  const [ref, setRef] = useState('');

  if (loading) return <MLoader />;
  if (error) return <MError error={error} onRetry={reload} />;

  async function act(id, action, noteText) {
    setBusyId(id);
    try {
      await officerService.updateStatus(id, action, noteText);
      setRejectFor(null);
      setNote('');
      await reload();
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function pay(id) {
    setBusyId(id);
    try {
      await officerService.markPaid(id, ref);
      setPayFor(null);
      setRef('');
      await reload();
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="m-stagger">
      <div className="m-chip-row" role="tablist" aria-label={t('officer.pendingRequests')}>
        {FILTERS.map((f) => (
          <button key={f || 'all'} type="button" className={`m-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f ? t(`status.${f}`) : t('common.all')}
          </button>
        ))}
      </div>

      {data.requests.length === 0 ? (
        <MEmpty title={t('officer.noPending')} />
      ) : (
        data.requests.map((r) => (
          <MCard key={r.id} plain className="m-req-card">
            <div className="m-req-top">
              <span className="m-token-chip">{r.tokenNumber}</span>
              <div className="m-req-side">
                <MBadge status={r.status} />
                <MPayBadge payment={r.payment} />
              </div>
            </div>
            <div className="m-req-body">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="m-req-name">
                  {r.farmer?.name}
                  <span className="m-verified" title="Verified farmer"><Icon name="check" size={10} strokeWidth={3.5} /></span>
                </div>
                <div className="m-req-crop">{pick(r.crop, 'name')} · {r.quantityQuintals} {t('common.quintalShort')}</div>
              </div>
              <div className="m-req-amount">{formatInr(r.payment ? r.payment.amountInr : r.estimatedValueInr)}</div>
            </div>
            <div className="m-req-meta">
              <span><Icon name="clock" size={13} /> {formatDate(r.createdAt, lang)}</span>
              <span><Icon name="pin" size={13} /> {pick(r.centre, 'name')}</span>
              {r.payment?.status === 'PAID' && r.payment.reference && <span><Icon name="rupee" size={13} /> UTR {r.payment.reference}</span>}
              {r.status === 'REJECTED' && r.note && <span><Icon name="info" size={13} /> {r.note}</span>}
            </div>

            {(['WAITING', 'CALLED', 'PROCESSING'].includes(r.status) || r.payment?.status === 'PENDING') && (
              <div className="m-btn-row" style={{ marginTop: 12 }}>
                {r.status === 'WAITING' && (
                  <MBtn size="sm" variant="primary" disabled={busyId === r.id} onClick={() => act(r.id, 'CALL')} icon={<Icon name="megaphone" size={14} />}>{t('officer.call')}</MBtn>
                )}
                {r.status === 'CALLED' && (
                  <MBtn size="sm" variant="primary" disabled={busyId === r.id} onClick={() => act(r.id, 'START')}>{t('officer.start')}</MBtn>
                )}
                {r.status === 'PROCESSING' && (
                  <MBtn size="sm" variant="gold" disabled={busyId === r.id} onClick={() => act(r.id, 'COMPLETE')} icon={<Icon name="check" size={14} strokeWidth={2.8} />}>{t('officer.complete')}</MBtn>
                )}
                {['WAITING', 'CALLED'].includes(r.status) && (
                  <MBtn size="sm" variant="danger" disabled={busyId === r.id} onClick={() => { setRejectFor(r); setNote(''); }}>{t('officer.reject')}</MBtn>
                )}
                {r.payment?.status === 'PENDING' && (
                  <MBtn size="sm" variant="soft" disabled={busyId === r.id} onClick={() => { setPayFor(r); setRef(''); }} icon={<Icon name="rupee" size={14} />}>{t('officer.markPaid')}</MBtn>
                )}
              </div>
            )}
          </MCard>
        ))
      )}

      {/* session summary */}
      {data.requests.length > 0 && (() => {
        const done = data.requests.filter((r) => r.status === 'COMPLETED').length;
        const live = data.requests.filter((r) => ['WAITING', 'CALLED', 'PROCESSING'].includes(r.status));
        const total = done + live.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const queueValue = live.reduce((sum, r) => sum + (r.estimatedValueInr || 0), 0);
        return (
          <MCard plain>
            <div className="m-card-h m-card-h-split">
              <span><Icon name="activity" size={18} /> {t('officer.sessionThroughput')}</span>
              <span className="m-card-h-val">{done}/{total}</span>
            </div>
            <MBar pct={pct} />
            <div className="m-stat-grid m-stat-grid-2" style={{ marginTop: 14 }}>
              <div className="m-mini-stat"><span className="m-mini-stat-k">{t('officer.queueValue')}</span><span className="m-mini-stat-v">{formatInr(queueValue)}</span></div>
              <div className="m-mini-stat"><span className="m-mini-stat-k">{t('officer.completed')}</span><span className="m-mini-stat-v">{pct}%</span></div>
            </div>
          </MCard>
        );
      })()}

      {/* reject sheet */}
      <Sheet open={Boolean(rejectFor)} onClose={() => setRejectFor(null)} title={t('officer.reject')} sub={rejectFor ? `${rejectFor.tokenNumber} · ${rejectFor.farmer?.name}` : ''}>
        <MField label={t('officer.rejectNote')} htmlFor="rej-note">
          <MInput id="rej-note" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
        </MField>
        <div className="m-btn-row">
          <MBtn variant="soft" onClick={() => setRejectFor(null)}>{t('common.cancel')}</MBtn>
          <MBtn variant="danger" disabled={busyId === rejectFor?.id} onClick={() => act(rejectFor.id, 'REJECT', note)}>{t('common.confirm')}</MBtn>
        </div>
      </Sheet>

      {/* mark paid sheet */}
      <Sheet open={Boolean(payFor)} onClose={() => setPayFor(null)} title={t('officer.markPaid')} sub={payFor ? `${payFor.tokenNumber} · ${payFor.farmer?.name} · ${formatInr(payFor.payment.amountInr)}` : ''}>
        <MField label={t('officer.refPlaceholder')} htmlFor="pay-ref2">
          <MInput id="pay-ref2" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UTR…" autoFocus />
        </MField>
        <div className="m-btn-row">
          <MBtn variant="soft" onClick={() => setPayFor(null)}>{t('common.cancel')}</MBtn>
          <MBtn variant="primary" disabled={busyId === payFor?.id} onClick={() => pay(payFor.id)} icon={<Icon name="rupee" size={16} />}>{t('common.confirm')}</MBtn>
        </div>
      </Sheet>
    </div>
  );
}
