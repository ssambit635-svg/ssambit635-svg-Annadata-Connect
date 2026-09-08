import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { farmerService, notificationService, requestService } from '../../services/api/farmerService.js';
import { Loading, ErrorState } from '../../components/States.jsx';
import { TokenCard } from '../../components/TokenCard.jsx';
import { formatDate, formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { MCard, MBtn, MStat, SectionH, greetingKey } from '../../mobile/ui.jsx';
import { ArtSun, ArtRupeeSprout, ArtWheat, ArtFarmer, ArtLeafPair } from '../../mobile/art.jsx';

const QUICK_ACTIONS = [
  { to: '/sell', icon: 'rupee', key: 'farmer.sellNow', gold: true },
  { to: '/requests/new', icon: 'plus', key: 'farmer.createRequest' },
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
  const dateStr = new Date().toLocaleDateString(lang === 'en' ? 'en-IN' : lang === 'hi' ? 'hi-IN' : 'or-IN', { weekday: 'long', day: 'numeric', month: 'long' });

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
    <div>
      {/* ── greeting hero ── */}
      <MCard plain className="green dash-hero">
        <ArtSun size={64} className="dash-hero-art" />
        <div className="dash-hero-copy">
          <div className="m-hero-eyebrow">{t('app.name')}</div>
          <h1>{t(greetingKey())}, {profile.name.split(' ')[0]}</h1>
          <p>{profile.village ? pick(profile.village, 'name') : ''} · {dateStr}</p>
        </div>
      </MCard>

      {/* ── sell now CTA ── */}
      <div className="sell-cta">
        <span className="sell-cta-art"><ArtRupeeSprout size={30} /></span>
        <div className="sell-cta-copy">
          <strong>{t('farmer.sellNow')}</strong>
          <span>{t('farmer.sellNowHint')}</span>
        </div>
        <Link to="/sell" className="btn btn-primary">
          <Icon name="rupee" size={16} /> {t('farmer.sellNow')} <Icon name="arrowUpRight" size={15} />
        </Link>
      </div>

      <div className="grid two" style={{ marginTop: 2 }}>
        {/* ── active request ── */}
        <section aria-labelledby="active-h">
          <h2 id="active-h" className="m-page-title" style={{ fontSize: 19, marginBottom: 10 }}>{t('farmer.activeRequest')}</h2>
          {activeRequest ? (
            <MCard plain>
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
                  <Icon name="ticket" size={15} /> {t('farmer.viewToken')}
                </Link>
                <Link className="btn btn-outline btn-sm" to={`/requests/${activeRequest.id}/status`}>
                  <Icon name="clipboard" size={15} /> {t('farmer.viewStatus')}
                </Link>
                {activeRequest.status === 'WAITING' && (
                  <button className="btn btn-danger btn-sm" onClick={onCancel} disabled={cancelBusy}>
                    {t('farmer.cancelRequest')}
                  </button>
                )}
              </div>
            </MCard>
          ) : (
            <MCard plain style={{ textAlign: 'center' }}>
              <ArtFarmer size={104} className="m-anim-pop" style={{ margin: '0 auto' }} />
              <div className="m-state-title" style={{ marginTop: 6 }}>{t('farmer.noActive')}</div>
              <p style={{ color: 'var(--m-ink-soft)', fontSize: 14, margin: '4px 0 14px' }}>{t('farmer.noActiveHint')}</p>
              <div className="m-btn-row" style={{ justifyContent: 'center' }}>
                <MBtn to="/sell" variant="primary" icon={<Icon name="rupee" size={17} />}>{t('farmer.sellNow')}</MBtn>
                <MBtn to="/requests/new" variant="soft" icon={<Icon name="plus" size={17} />}>{t('farmer.createRequest')}</MBtn>
              </div>
            </MCard>
          )}
        </section>

        {/* ── notifications ── */}
        <section aria-labelledby="notif-h">
          <h2 id="notif-h" className="dash-section-title m-page-title" style={{ fontSize: 19, marginBottom: 10 }}>
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
          <MCard plain>
            <div className="notif-stack">
              {notifications.length === 0 && <div style={{ color: 'var(--m-ink-faint)' }}>{t('farmer.noNotifications')}</div>}
              {notifications.slice(0, 6).map((n) => (
                <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
                  <div>{pick(n, 'message')}</div>
                  <div className="when">{formatDate(n.createdAt, lang)}</div>
                </div>
              ))}
            </div>
          </MCard>
        </section>
      </div>

      {/* ── quick actions ── */}
      <div style={{ marginTop: 4 }}>
        <SectionH title={t('farmer.quickActions')} art={<ArtWheat size={26} />} />
        <div className="quick-grid">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.to} className="quick-tile" to={a.to}>
              <span className="quick-ico" style={a.gold ? { background: 'var(--m-gold-soft)', color: 'var(--m-gold-deep)' } : undefined}>
                <Icon name={a.icon} size={19} />
              </span>
              {t(a.key)}
            </Link>
          ))}
        </div>
      </div>

      {/* ── quick numbers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 16 }}>
        <MStat num={activeRequest ? formatInr(activeRequest.estimatedValueInr) : '—'} label={t('farmer.estimatedValue')} tone="gold" />
        <MStat num={activeQueue?.inQueue ? activeQueue.aheadCount : '—'} label={t('farmer.aheadOfYou')} />
        <MStat num={unread} label={t('farmer.notifications')} />
      </div>

      {/* ── saathi tip ── */}
      <MCard className="leaf" style={{ marginTop: 14 }}>
        <div className="m-card-h">
          <ArtLeafPair size={18} /> {t('saathi.tipTitle')}
        </div>
        <p style={{ fontSize: 14, color: 'var(--m-ink)', margin: 0 }}>{t('farmer.mspNote')}</p>
      </MCard>
    </div>
  );
}
