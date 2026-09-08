import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { officerService } from '../../services/api/farmerService.js';
import { Loading, ErrorState, EmptyState } from '../../components/States.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { useState } from 'react';
import Icon from '../../components/Icon.jsx';

// Live queue for the officer's centre. Renders as a table on wide screens
// and as stacked cards on phones (see `.queue-table` in web-apk.css) so
// the action buttons are never clipped off the right edge.
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

  const labels = {
    position: t('officer.position'),
    token: t('officer.token'),
    farmer: t('officer.farmerCol'),
    crop: t('officer.cropCol'),
    qty: t('officer.qtyCol'),
    status: t('officer.statusCol'),
    actions: t('officer.actions'),
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('officer.currentQueue')}</h1>
          <p className="page-sub">{pick(data.centre, 'name')}</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={reload} disabled={refreshing}>
          <Icon name="refresh" size={14} /> {t('common.refresh')}
        </button>
      </div>
      {data.queue.length === 0 ? (
        <EmptyState title={t('officer.noPending')} />
      ) : (
        <div className="table-wrap queue-table">
          <table className="data">
            <thead>
              <tr>
                <th>{labels.position}</th>
                <th>{labels.token}</th>
                <th>{labels.farmer}</th>
                <th>{labels.crop}</th>
                <th>{labels.qty}</th>
                <th>{labels.status}</th>
                <th>{labels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {data.queue.map((r) => {
                const busy = busyId === r.id;
                return (
                  <tr key={r.id}>
                    <td className="mono" data-label={labels.position}>#{r.position}</td>
                    <td className="mono" data-label={labels.token}>{r.tokenNumber}</td>
                    <td data-label={labels.farmer}>
                      <span className="cell-main">{r.farmer?.name}</span>
                      <span className="cell-sub">{r.farmer?.phone}</span>
                    </td>
                    <td data-label={labels.crop}>{pick(r.crop, 'name')}</td>
                    <td data-label={labels.qty} className="nowrap">{r.quantityQuintals} {t('common.quintalShort')}</td>
                    <td data-label={labels.status}><StatusBadge status={r.status} /></td>
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
                        {r.status === 'CALLED' && (
                          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => act(r.id, 'REJECT')}>
                            {t('officer.reject')}
                          </button>
                        )}
                        {r.status === 'PROCESSING' && (
                          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(r.id, 'COMPLETE')}>
                            <Icon name="check" size={14} strokeWidth={2.6} /> {t('officer.complete')}
                          </button>
                        )}
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
