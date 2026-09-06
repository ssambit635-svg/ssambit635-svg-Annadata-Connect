// Live token view — big ticket, live queue, payment state, centre pulse.
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { requestService } from '../../services/api/farmerService.js';
import { formatDate, formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtQueue, ArtScales } from '../art.jsx';
import { MCard, MStat, MLoader, MError, TicketCard, MPayBadge, MBtn, SectionH } from '../ui.jsx';

export default function Token() {
  const { id } = useParams();
  const { t, pick, lang } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(() => requestService.get(id), { intervalMs: 8000, deps: [id] });

  if (loading) return <MLoader />;
  if (error) return <MError error={error} onRetry={reload} />;

  const { request, queue } = data;

  return (
    <div className="m-stagger">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="m-live">{t('saathi.liveToken')}</span>
        <button type="button" className="m-chip" onClick={reload} disabled={refreshing}>
          <Icon name="refresh" size={14} /> {t('common.refresh')}
        </button>
      </div>

      <TicketCard request={request} queue={queue} />

      {request.status === 'CALLED' && (
        <div className="m-banner info" role="status" style={{ justifyContent: 'center', fontSize: 16 }}>
          <Icon name="megaphone" size={19} />
          <strong>{t('status.CALLED')} — {t('farmer.centre')}: {pick(request.centre, 'name')}</strong>
        </div>
      )}

      {/* crop & value */}
      <MCard plain>
        <div className="m-card-h"><Icon name="wheat" size={19} /> {t('farmer.crop')} · {t('farmer.quantity')}</div>
        <div className="m-kv"><Icon name="wheat" size={17} /><span>{pick(request.crop, 'name')} — {request.quantityQuintals} {t('common.quintal')}</span></div>
        <div className="m-kv"><Icon name="card" size={17} /><span>{t('farmer.estimatedValue')}: <strong>{formatInr(request.estimatedValueInr)}</strong></span></div>
        <div className="m-kv"><Icon name="clock" size={17} /><span>{t('farmer.lastUpdated')}: {formatDate(request.updatedAt, lang)}</span></div>
      </MCard>

      {/* payment */}
      <MCard plain>
        <div className="m-card-h"><ArtScales size={26} /> {t('farmer.payment.title')}</div>
        {request.payment ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <MPayBadge payment={request.payment} />
              <strong style={{ fontFamily: 'var(--m-f-display)', fontSize: 22, color: 'var(--m-green-deep)' }}>{formatInr(request.payment.amountInr)}</strong>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--m-ink-soft)', marginTop: 6 }}>
              {request.payment.status === 'PENDING'
                ? t('farmer.payment.processing')
                : <>
                    {t('farmer.payment.paidOn')}: {formatDate(request.payment.paidAt, lang)}
                    {request.payment.reference ? ` · ${t('farmer.payment.ref')}: ${request.payment.reference}` : ''}
                  </>}
            </p>
          </>
        ) : (
          <p style={{ color: 'var(--m-ink-soft)', fontSize: 14.5 }}>{t('farmer.payment.none')}</p>
        )}
      </MCard>

      {/* centre pulse */}
      {queue?.centreSummary && (
        <>
          <SectionH title={t('farmer.servingNow')} art={<ArtQueue size={40} />} />
          <div className="m-stat-grid">
            <MStat num={queue.centreSummary.waiting} label={t('officer.waiting')} tone="warning" />
            <MStat num={queue.centreSummary.called + queue.centreSummary.processing} label={t('officer.processing')} tone="info" />
            <MStat num={queue.centreSummary.completed} label={t('officer.completed')} />
          </div>
        </>
      )}

      <div className="m-btn-row" style={{ marginTop: 6 }}>
        <MBtn to={`/requests/${id}/status`} variant="primary" icon={<Icon name="clipboard" size={17} />}>
          {t('farmer.viewStatus')}
        </MBtn>
        <MBtn to="/farmer" variant="soft">{t('nav.dashboard')}</MBtn>
      </div>
    </div>
  );
}
