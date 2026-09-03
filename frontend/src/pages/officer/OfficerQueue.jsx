import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { officerService } from '../../services/api/farmerService.js';
import { Loading, ErrorState, EmptyState } from '../../components/States.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { useState } from 'react';
import Icon from '../../components/Icon.jsx';

export default function OfficerQueue() {
  const { t, pick } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(() => officerService.queue(), { intervalMs: 10000 });
  const [busyId, setBusyId] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  async function act(id, action) {
    setBusyId(id);
    try {
      await officerService.updateStatus(id, action);
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
        <h1>{t('officer.currentQueue')} — {pick(data.centre, 'name')}</h1>
        <button className="btn btn-outline btn-sm" onClick={reload} disabled={refreshing}><Icon name="refresh" size={14} /> {t('common.refresh')}</button>
      </div>
      {data.queue.length === 0 ? (
        <EmptyState title={t('officer.noPending')} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('officer.position')}</th>
                <th>{t('officer.token')}</th>
                <th>{t('officer.farmerCol')}</th>
                <th>{t('officer.cropCol')}</th>
                <th>{t('officer.qtyCol')}</th>
                <th>{t('officer.statusCol')}</th>
                <th>{t('officer.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.queue.map((r) => (
                <tr key={r.id}>
                  <td className="mono">#{r.position}</td>
                  <td className="mono">{r.tokenNumber}</td>
                  <td>{r.farmer?.name}<div style={{ fontSize: '0.8rem', color: 'var(--c-text-soft)' }}>{r.farmer?.phone}</div></td>
                  <td>{pick(r.crop, 'name')}</td>
                  <td>{r.quantityQuintals} {t('common.quintalShort')}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {r.status === 'WAITING' && <button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => act(r.id, 'CALL')}>{t('officer.call')}</button>}
                      {r.status === 'CALLED' && <button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => act(r.id, 'START')}>{t('officer.start')}</button>}
                      {r.status === 'CALLED' && <button className="btn btn-danger btn-sm" disabled={busyId === r.id} onClick={() => act(r.id, 'REJECT')}>{t('officer.reject')}</button>}
                      {r.status === 'PROCESSING' && <button className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => act(r.id, 'COMPLETE')}><Icon name="check" size={14} strokeWidth={2.6} /> {t('officer.complete')}</button>}
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
