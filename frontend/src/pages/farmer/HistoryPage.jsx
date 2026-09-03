import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { requestService } from '../../services/api/farmerService.js';
import { Loading, ErrorState, EmptyState } from '../../components/States.jsx';
import { StatusBadge, PaymentBadge } from '../../components/StatusBadge.jsx';
import { formatDate, formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';

// Farmer records dashboard: every token ever issued, its procurement status
// and its payment status — data comes live from the backend, nothing static.
export default function HistoryPage() {
  const { t, pick, lang } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(() => requestService.mine(), { intervalMs: 15000 });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const rows = data.requests;
  const paidRows = rows.filter((r) => r.payment?.status === 'PAID');
  const pendingPayRows = rows.filter((r) => r.payment?.status === 'PENDING');
  const paidSum = paidRows.reduce((s, r) => s + r.payment.amountInr, 0);
  const pendingSum = pendingPayRows.reduce((s, r) => s + r.payment.amountInr, 0);

  return (
    <>
      <div className="page-head">
        <h1>{t('farmer.recordsTitle')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={reload} disabled={refreshing}><Icon name="refresh" size={14} /> {t('common.refresh')}</button>
          <Link className="btn btn-primary btn-sm" to="/requests/new">＋ {t('nav.newRequest')}</Link>
        </div>
      </div>

      {/* Summary strip — answers "how much have I earned / how much is pending" at a glance */}
      <div className="grid stats" style={{ marginBottom: '1rem' }}>
        <div className="stat"><div className="num">{rows.length}</div><div className="lbl">{t('farmer.totalTokens')}</div></div>
        <div className="stat ok"><div className="num">{rows.filter((r) => r.status === 'COMPLETED').length}</div><div className="lbl">{t('status.COMPLETED')}</div></div>
        <div className="stat ok"><div className="num">{formatInr(paidSum)}</div><div className="lbl">{t('farmer.earnedTotal')}</div></div>
        <div className="stat warn"><div className="num">{formatInr(pendingSum)}</div><div className="lbl">{t('farmer.paymentPendingTotal')}</div></div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={t('farmer.noRecords')}
          action={<Link className="btn btn-primary" to="/requests/new">＋ {t('farmer.createRequest')}</Link>}
        />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('officer.token')}</th>
                <th>{t('farmer.crop')}</th>
                <th>{t('officer.qtyCol')}</th>
                <th>{t('farmer.centre')}</th>
                <th>{t('farmer.procurementCol')}</th>
                <th>{t('farmer.paymentCol')}</th>
                <th>{t('farmer.estimatedValue')}</th>
                <th>{t('common.today')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.tokenNumber}</td>
                  <td>{pick(r.crop, 'name')}</td>
                  <td>{r.quantityQuintals} {t('common.quintalShort')}</td>
                  <td>{pick(r.centre, 'name')}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><PaymentBadge payment={r.payment} /></td>
                  <td>{formatInr(r.payment ? r.payment.amountInr : r.estimatedValueInr)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.createdAt, lang)}</td>
                  <td>
                    <Link className="btn btn-outline btn-sm" to={`/requests/${r.id}`}>{t('common.view')}</Link>
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
