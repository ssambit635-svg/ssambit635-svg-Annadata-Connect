import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { officerService } from '../../services/api/farmerService.js';
import { Loading, ErrorState, EmptyState } from '../../components/States.jsx';
import { StatusBadge, PaymentBadge } from '../../components/StatusBadge.jsx';
import { formatDate, formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';

const FILTERS = ['', 'WAITING', 'CALLED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED'];

// All requests at the officer's centre, filterable by status. Desktop shows a
// table; phones get stacked cards (`.queue-table` in web-apk.css) so the
// payment / action controls never get clipped.
export default function OfficerRequests() {
  const { t, pick, lang } = useI18n();
  const [filter, setFilter] = useState('');
  const { data, error, loading, reload } = usePoll(() => officerService.requests(filter), { intervalMs: 15000, deps: [filter] });
  const [rejectFor, setRejectFor] = useState(null);
  const [note, setNote] = useState('');
  const [payFor, setPayFor] = useState(null);
  const [ref, setRef] = useState('');
  const [busyId, setBusyId] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  async function pay(id, reference) {
    setBusyId(id);
    try {
      await officerService.markPaid(id, reference);
      setPayFor(null);
      setRef('');
      await reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function act(id, action, noteText) {
    setBusyId(id);
    try {
      await officerService.updateStatus(id, action, noteText);
      setRejectFor(null);
      setNote('');
      await reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const labels = {
    token: t('officer.token'),
    farmer: t('officer.farmerCol'),
    crop: t('officer.cropCol'),
    qty: t('officer.qtyCol'),
    value: t('farmer.estimatedValue'),
    status: t('officer.statusCol'),
    payment: t('officer.paymentCol'),
    when: t('common.date'),
    actions: t('officer.actions'),
  };

  return (
    <>
      <div className="page-head">
        <h1>{t('officer.pendingRequests')}</h1>
        <div className="m-chip-row filter-chips" role="tablist" aria-label={t('officer.statusCol')}>
          {FILTERS.map((f) => (
            <button
              key={f || 'all'}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`m-chip${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f ? t(`status.${f}`) : t('common.all')}
            </button>
          ))}
        </div>
      </div>

      {data.requests.length === 0 ? (
        <EmptyState title={t('officer.noPending')} />
      ) : (
        <div className="table-wrap queue-table requests-table">
          <table className="data">
            <thead>
              <tr>
                <th>{labels.token}</th>
                <th>{labels.farmer}</th>
                <th>{labels.crop}</th>
                <th>{labels.qty}</th>
                <th>{labels.value}</th>
                <th>{labels.status}</th>
                <th>{labels.payment}</th>
                <th>{labels.when}</th>
                <th>{labels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {data.requests.map((r) => {
                const busy = busyId === r.id;
                const canReject = ['WAITING', 'CALLED'].includes(r.status);
                return (
                  <tr key={r.id}>
                    <td className="mono" data-label={labels.token}>{r.tokenNumber}</td>
                    <td data-label={labels.farmer}>{r.farmer?.name}</td>
                    <td data-label={labels.crop}>{pick(r.crop, 'name')}</td>
                    <td data-label={labels.qty} className="nowrap">{r.quantityQuintals} {t('common.quintalShort')}</td>
                    <td data-label={labels.value} className="nowrap">{formatInr(r.estimatedValueInr)}</td>
                    <td data-label={labels.status}><StatusBadge status={r.status} /></td>
                    <td data-label={labels.payment} className="cell-payment">
                      <div className="row-actions">
                        <PaymentBadge payment={r.payment} />
                        {r.payment?.status === 'PENDING' &&
                          (payFor === r.id ? (
                            <span className="inline-form">
                              <input
                                className="input"
                                placeholder={t('officer.refPlaceholder')}
                                value={ref}
                                autoFocus
                                onChange={(e) => setRef(e.target.value)}
                                aria-label={t('officer.refPlaceholder')}
                              />
                              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => pay(r.id, ref)}>
                                {t('common.confirm')}
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setPayFor(null); setRef(''); }} aria-label={t('common.cancel')}>
                                <Icon name="x" size={15} />
                              </button>
                            </span>
                          ) : (
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => { setPayFor(r.id); setRef(''); }}>
                              <Icon name="rupee" size={14} /> {t('officer.markPaid')}
                            </button>
                          ))}
                        {r.payment?.status === 'PAID' && r.payment.reference && (
                          <span className="cell-sub">{r.payment.reference}</span>
                        )}
                      </div>
                    </td>
                    <td data-label={labels.when} className="nowrap">{formatDate(r.createdAt, lang)}</td>
                    <td className="cell-actions" data-label={labels.actions}>
                      <div className="row-actions">
                        {r.status === 'WAITING' && (
                          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(r.id, 'CALL')}>
                            <Icon name="megaphone" size={14} /> {t('officer.call')}
                          </button>
                        )}
                        {r.status === 'CALLED' && (
                          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(r.id, 'START')}>
                            {t('officer.start')}
                          </button>
                        )}
                        {r.status === 'PROCESSING' && (
                          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(r.id, 'COMPLETE')}>
                            <Icon name="check" size={14} strokeWidth={2.6} /> {t('officer.complete')}
                          </button>
                        )}
                        {canReject &&
                          (rejectFor === r.id ? (
                            <span className="inline-form">
                              <input
                                className="input"
                                placeholder={t('officer.rejectNote')}
                                value={note}
                                autoFocus
                                onChange={(e) => setNote(e.target.value)}
                                aria-label={t('officer.rejectNote')}
                              />
                              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => act(r.id, 'REJECT', note)}>
                                {t('common.confirm')}
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setRejectFor(null); setNote(''); }} aria-label={t('common.cancel')}>
                                <Icon name="x" size={15} />
                              </button>
                            </span>
                          ) : (
                            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setRejectFor(r.id)}>
                              {t('officer.reject')}
                            </button>
                          ))}
                        {!canReject && r.status !== 'PROCESSING' && <span className="cell-sub">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
