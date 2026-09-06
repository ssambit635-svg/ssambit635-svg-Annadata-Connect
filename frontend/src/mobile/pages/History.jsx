// My records — every token ever issued, with earnings at a glance.
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { requestService } from '../../services/api/farmerService.js';
import { formatDate, formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtRupeeSprout, ArtBasket } from '../art.jsx';
import { MStat, MLoader, MError, MEmpty, MBadge, MPayBadge, MBtn, SectionH } from '../ui.jsx';

export default function History() {
  const { t, pick, lang } = useI18n();
  const { data, error, loading, reload } = usePoll(() => requestService.mine(), { intervalMs: 15000 });

  if (loading) return <MLoader />;
  if (error) return <MError error={error} onRetry={reload} />;

  const rows = data.requests;
  const paidRows = rows.filter((r) => r.payment?.status === 'PAID');
  const pendingRows = rows.filter((r) => r.payment?.status === 'PENDING');
  const paidSum = paidRows.reduce((s, r) => s + r.payment.amountInr, 0);
  const pendingSum = pendingRows.reduce((s, r) => s + r.payment.amountInr, 0);

  return (
    <div className="m-stagger">
      <SectionH title={t('farmer.recordsTitle')} art={<ArtRupeeSprout size={30} />} />

      <div className="m-stat-grid">
        <MStat num={rows.length} label={t('farmer.totalTokens')} />
        <MStat num={rows.filter((r) => r.status === 'COMPLETED').length} label={t('status.COMPLETED')} />
        <MStat num={formatInr(paidSum)} label={t('farmer.earnedTotal')} className="gold" />
        <MStat num={formatInr(pendingSum)} label={t('farmer.paymentPendingTotal')} tone="warning" />
      </div>

      {rows.length === 0 ? (
        <MEmpty
          art={<ArtBasket size={100} className="m-anim-bob" />}
          title={t('farmer.noRecords')}
          hint={t('farmer.noActiveHint')}
          action={<MBtn to="/requests/new" variant="primary" size="sm" icon={<Icon name="plus" size={16} />}>{t('farmer.createRequest')}</MBtn>}
        />
      ) : (
        <div className="m-stack">
          {rows.map((r) => (
            <Link key={r.id} to={`/requests/${r.id}`} style={{ textDecoration: 'none' }}>
              <div className="m-row">
                <span className="m-row-ico">{r.tokenNumber}</span>
                <div className="m-row-main">
                  <div className="m-row-title">{pick(r.crop, 'name')} · {r.quantityQuintals}{t('common.quintalShort')}</div>
                  <div className="m-row-sub">
                    {pick(r.centre, 'name')} · {formatDate(r.createdAt, lang)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                    <MBadge status={r.status} />
                    <MPayBadge payment={r.payment} />
                  </div>
                </div>
                <div className="m-row-side">
                  <div className="m-row-amount">{formatInr(r.payment ? r.payment.amountInr : r.estimatedValueInr)}</div>
                  <Icon name="arrowUpRight" size={16} style={{ color: 'var(--m-ink-faint)', marginTop: 4 }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
