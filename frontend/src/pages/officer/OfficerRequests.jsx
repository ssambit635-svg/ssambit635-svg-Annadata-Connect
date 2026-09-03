import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { officerService } from '../../services/api/farmerService.js';
import { Loading, ErrorState, EmptyState } from '../../components/States.jsx';
import { StatusBadge, PaymentBadge } from '../../components/StatusBadge.jsx';
import { formatDate, formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';

const FILTERS = ['', 'WAITING', 'CALLED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED'];

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

  return (
    <>
      <div className="page-head">
        <h1>{t('officer.pendingRequests')}</h1>
        <div className="chips" role="tablist">
          {FILTERS.map((f) => (
            <button key={f || 'all'} className={filter === f ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'} onClick={() => setFilter(f)}>
              {f ? t(`status.${f}`) : t('common.all')}
            </button>
          ))}
        </div>
      </div>

      {data.requests.length === 0 ? (
        <EmptyState title={t('officer.noPending')} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('officer.token')}</th>
                <th>{t('officer.farmerCol')}</th>
                <th>{t('officer.cropCol')}</th>
                <th>{t('officer.qtyCol')}</th>
                <th>MSP {t('farmer.estimatedValue')}</th>
                <th>{t('officer.statusCol')}</th>
                <th>{t('officer.paymentCol')}</th>
                <th>{t('common.today')}</th>
                <th>{t('officer.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.requests.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.tokenNumber}</td>
                  <td>{r.farmer?.name}</td>
                  <td>{pick(r.crop, 'name')}</td>
                  <td>{r.quantityQuintals} {t('common.quintalShort')}</td>
                  <td>{formatInr(r.estimatedValueInr)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <PaymentBadge payment={r.payment} />
                      {r.payment?.status === 'PENDING' &&
                        (payFor === r.id ? (
                          <span style={{ display: 'inline-flex', gap: '0.3rem' }}>
                            <input className="input" style={{ minHeight: 36, width: 150 }} placeholder={t('officer.refPlaceholder')} value={ref} onChange={(e) => setRef(e.target.value)} />
                            <button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => pay(r.id, ref)}>{t('common.confirm')}</button>
                          </span>
                        ) : (
                          <button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => { setPayFor(r.id); setRef(''); }}>₹ {t('officer.markPaid')}</button>
                        ))}
                      {r.payment?.status === 'PAID' && r.payment.reference && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--c-text-soft)' }}>{r.payment.reference}</span>
                      )}
                    </div>
                  </td>
                  <td>{formatDate(r.createdAt, lang)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {r.status === 'WAITING' && <button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => act(r.id, 'CALL')}>{t('officer.call')}</button>}
                      {r.status === 'CALLED' && <button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => act(r.id, 'START')}>{t('officer.start')}</button>}
                      {r.status === 'PROCESSING' && <button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => act(r.id, 'COMPLETE')}><Icon name="check" size={14} strokeWidth={2.6} /> {t('officer.complete')}</button>}
                      {['WAITING', 'CALLED'].includes(r.status) &&
                        (rejectFor === r.id ? (
                          <span style={{ display: 'inline-flex', gap: '0.3rem' }}>
                            <input className="input" style={{ minHeight: 36, width: 150 }} placeholder={t('officer.rejectNote')} value={note} onChange={(e) => setNote(e.target.value)} />
                            <button className="btn btn-danger btn-sm" disabled={busyId === r.id} onClick={() => act(r.id, 'REJECT', note)}>{t('common.confirm')}</button>
                          </span>
                        ) : (
                          <button className="btn btn-danger btn-sm" onClick={() => setRejectFor(r.id)}>{t('officer.reject')}</button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
