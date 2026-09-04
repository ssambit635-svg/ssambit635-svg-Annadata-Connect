import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { farmerService, notificationService, requestService } from '../../services/api/farmerService.js';
import { Loading, ErrorState, EmptyState } from '../../components/States.jsx';
import { TokenCard } from '../../components/TokenCard.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { formatDate } from '../../utils/format.js';
import { useState } from 'react';
import Icon from '../../components/Icon.jsx';

export default function FarmerDashboard() {
  const { t, pick, lang } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(
    async () => {
      const [profile, notifs] = await Promise.all([farmerService.me(), notificationService.list()]);
      return { ...profile, notifications: notifs.notifications, unread: notifs.unreadCount };
    },
    { intervalMs: 10000 }
  );
  const [cancelBusy, setCancelBusy] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { profile, activeRequest, activeQueue, notifications, unread } = data;

  async function onCancel() {
    if (!window.confirm(t('farmer.cancelConfirm'))) return;
    setCancelBusy(true);
    try {
      await requestService.cancel(activeRequest.id);
      reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>
          {t('farmer.welcome')}, {profile.name}
        </h1>
        <button className="btn btn-outline btn-sm" onClick={reload} disabled={refreshing}>
          <Icon name="refresh" size={14} /> {t('common.refresh')}
        </button>
      </div>

      <div className="grid two">
        <section aria-labelledby="active-h">
          <h2 id="active-h">{t('farmer.activeRequest')}</h2>
          {activeRequest ? (
            <>
              <TokenCard request={activeRequest} queue={activeQueue} />
              {activeQueue?.inQueue && (
                <p style={{ textAlign: 'center', color: 'var(--c-text-soft)' }}>
                  {activeQueue.aheadCount} {t('farmer.aheadOfYou')}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link className="btn btn-primary" to={`/requests/${activeRequest.id}`}>
                  <Icon name="ticket" size={16} /> {t('farmer.viewToken')}
                </Link>
                <Link className="btn btn-outline" to={`/requests/${activeRequest.id}/status`}>
                  <Icon name="clipboard" size={16} /> {t('farmer.viewStatus')}
                </Link>
                {activeRequest.status === 'WAITING' && (
                  <button className="btn btn-danger" onClick={onCancel} disabled={cancelBusy}>
                    {t('farmer.cancelRequest')}
                  </button>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              title={t('farmer.noActive')}
              hint={t('farmer.noActiveHint')}
              action={
                <Link className="btn btn-primary" to="/requests/new">
                  ＋ {t('farmer.createRequest')}
                </Link>
              }
            />
          )}
        </section>

        <section aria-labelledby="notif-h">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2 id="notif-h" style={{ margin: 0 }}>
              {t('farmer.notifications')} {unread > 0 && <span className="badge info">{unread}</span>}
            </h2>
            {unread > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={async () => {
                  await notificationService.readAll();
                  reload();
                }}
              >
                {t('farmer.markAllRead')}
              </button>
            )}
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            {notifications.length === 0 && <div className="card">{t('farmer.noNotifications')}</div>}
            {notifications.slice(0, 6).map((n) => (
              <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
                <div>{pick(n, 'message')}</div>
                <div className="when">{formatDate(n.createdAt, lang)}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>{t('farmer.quickActions')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link className="btn btn-outline btn-sm" to="/requests/new">＋ {t('nav.newRequest')}</Link>
              <Link className="btn btn-outline btn-sm" to="/sell"><Icon name="wheat" size={15} /> {t('nav.smartSell')}</Link>
              <Link className="btn btn-outline btn-sm" to="/market-prices"><Icon name="chart" size={15} /> {t('nav.marketPrices')}</Link>
              <Link className="btn btn-outline btn-sm" to="/history"><Icon name="folder" size={15} /> {t('nav.history')}</Link>
              <Link className="btn btn-outline btn-sm" to="/centres"><Icon name="store" size={15} /> {t('farmer.centresTitle')}</Link>
              <Link className="btn btn-outline btn-sm" to="/id-card"><Icon name="idCard" size={15} /> {t('nav.idCard')}</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
