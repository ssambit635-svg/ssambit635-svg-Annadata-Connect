import { useI18n } from '../i18n/I18nContext.jsx';
import { statusTone } from '../utils/format.js';

export function StatusBadge({ status }) {
  const { t } = useI18n();
  return (
    <span className={`badge ${statusTone(status)}`}>
      <span className={`dot ${statusTone(status)}`} aria-hidden />
      {t(`status.${status}`)}
    </span>
  );
}

// Payment state chip: PENDING → amber, PAID → green. Shows nothing when no payment exists.
export function PaymentBadge({ payment }) {
  const { t } = useI18n();
  if (!payment) return <span className="badge neutral">—</span>;
  const paid = payment.status === 'PAID';
  return (
    <span className={`badge ${paid ? 'success' : 'warning'}`} title={paid && payment.paidAt ? payment.paidAt : undefined}>
      <span className={`dot ${paid ? 'success' : 'warning'}`} aria-hidden />
      {paid ? t('farmer.payment.paid') : t('farmer.payment.pending')}
    </span>
  );
}
