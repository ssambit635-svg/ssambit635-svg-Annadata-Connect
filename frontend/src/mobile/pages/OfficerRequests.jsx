// All requests with filters — status actions and payment settling.
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { officerService } from '../../services/api/farmerService.js';
import { formatDate, formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { MCard, MLoader, MError, MEmpty, MBadge, MPayBadge, MBtn, Sheet, MField, MInput } from '../ui.jsx';

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
          <MCard key={r.id} plain tight>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="m-row-ico">{r.tokenNumber}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong>{r.farmer?.name}</strong>
                  <MBadge status={r.status} />
                  <MPayBadge payment={r.payment} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--m-ink-soft)', marginTop: 2 }}>
                  {pick(r.crop, 'name')} · {r.quantityQuintals}{t('common.quintalShort')} · {formatInr(r.estimatedValueInr)}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--m-ink-faint)', marginTop: 2 }}>{formatDate(r.createdAt, lang)}</div>
              </div>
            </div>

            <div className="m-btn-row" style={{ marginTop: 10 }}>
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
            {r.payment?.status === 'PAID' && r.payment.reference && (
              <p style={{ fontSize: 11.5, color: 'var(--m-ink-faint)', marginTop: 8 }}>UTR: {r.payment.reference}</p>
            )}
          </MCard>
        ))
      )}

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
