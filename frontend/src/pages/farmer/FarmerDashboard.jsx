import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { farmerService, notificationService, requestService } from '../../services/api/farmerService.js';
import { Loading, ErrorState, EmptyState } from '../../components/States.jsx';
import { TokenCard } from '../../components/TokenCard.jsx';
import { formatDate } from '../../utils/format.js';
import { useState } from 'react';
import Icon from '../../components/Icon.jsx';

const QUICK_ACTIONS = [
  { to: '/requests/new', icon: 'plus', key: 'farmer.createRequest' },
  { to: '/sell', icon: 'wheat', key: 'nav.smartSell' },
  { to: '/market-prices', icon: 'chart', key: 'nav.marketPrices' },
  { to: '/history', icon: 'folder', key: 'nav.history' },
  { to: '/centres', icon: 'store', key: 'farmer.centresTitle' },
  { to: '/id-card', icon: 'idCard', key: 'nav.idCard' },
];

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
            <div className="active-request-wrap">
              <TokenCard request={activeRequest} queue={activeQueue} />
              {activeQueue?.inQueue && (
                <p className="queue-line">
                  <Icon name="users" size={16} />
                  <span>
                    <strong className="mono">{activeQueue.aheadCount}</strong> {t('farmer.aheadOfYou')}
                  </span>
                </p>
              )}
              <div className="dash-actions">
                <Link className="btn btn-primary btn-sm" to={`/requests/${activeRequest.id}`}>
                  <Icon name="ticket" size={16} /> {t('farmer.viewToken')}
                </Link>
                <Link className="btn btn-outline btn-sm" to={`/requests/${activeRequest.id}/status`}>
                  <Icon name="clipboard" size={16} /> {t('farmer.viewStatus')}
                </Link>
                {activeRequest.status === 'WAITING' && (
                  <button className="btn btn-danger btn-sm" onClick={onCancel} disabled={cancelBusy}>
                    {t('farmer.cancelRequest')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              title={t('farmer.noActive')}
              hint={t('farmer.noActiveHint')}
              action={
                <Link className="btn btn-primary" to="/requests/new">
                  <Icon name="plus" size={16} /> {t('farmer.createRequest')}
                </Link>
              }
            />
          )}
        </section>

        <section aria-labelledby="notif-h">
          <h2 id="notif-h" className="dash-section-title">
            <span>
              {t('farmer.notifications')} {unread > 0 && <span className="badge info">{unread}</span>}
            </span>
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
          </h2>
          <div className="notif-stack">
            {notifications.length === 0 && (
              <div className="card" style={{ marginBottom: 0 }}>{t('farmer.noNotifications')}</div>
            )}
            {notifications.slice(0, 6).map((n) => (
              <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
                <div>{pick(n, 'message')}</div>
                <div className="when">{formatDate(n.createdAt, lang)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card" aria-labelledby="quick-h" style={{ marginTop: '1rem' }}>
        <h2 id="quick-h" style={{ marginTop: 0, marginBottom: '0.9rem' }}>{t('farmer.quickActions')}</h2>
        <div className="quick-grid">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.to} className="quick-tile" to={a.to}>
              <span className="quick-ico"><Icon name={a.icon} size={19} /></span>
              {t(a.key)}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
