// Farmer home — greeting hero, live token ticket, quick actions,
// notifications and a rotating "Connect says" tip.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { farmerService, notificationService, requestService } from '../../services/api/farmerService.js';
import Icon from '../../components/Icon.jsx';
import { ArtSun, ArtFarmer, ArtField, ArtWheat, ArtLeafPair } from '../art.jsx';
import { MCard, MBtn, MLoader, MError, MEmpty, TicketCard, SectionH, MConfirm, greetingKey } from '../ui.jsx';

const ACTIONS = [
  { to: '/requests/new', icon: 'plus', key: 'farmer.createRequest', tone: '' },
  { to: '/sell', icon: 'rupee', key: 'nav.smartSell', tone: 'gold' },
  { to: '/market-prices', icon: 'chart', key: 'nav.marketPrices', tone: 'blue' },
  { to: '/centres', icon: 'store', key: 'nav.centres', tone: '' },
  { to: '/history', icon: 'folder', key: 'nav.history', tone: '' },
  { to: '/id-card', icon: 'idCard', key: 'nav.idCard', tone: 'gold' },
];

const TIPS = ['farmer.mspNote', 'farmer.tokenGeneratedHint', 'auth.neverShareCode'];

export default function Home() {
  const { t, pick, lang } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(
    async () => {
      const [profile, notifs] = await Promise.all([farmerService.me(), notificationService.list()]);
      return { ...profile, notifications: notifs.notifications, unread: notifs.unreadCount };
    },
    { intervalMs: 10000 }
  );
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  if (loading) return <MLoader />;
  if (error) return <MError error={error} onRetry={reload} />;

  const { profile, activeRequest, activeQueue, notifications, unread } = data;
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const dateStr = new Date().toLocaleDateString(lang === 'en' ? 'en-IN' : lang === 'hi' ? 'hi-IN' : 'or-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  async function doCancel() {
    setCancelBusy(true);
    setCancelError(null);
    try {
      await requestService.cancel(activeRequest.id);
      setConfirmCancel(false);
      reload();
    } catch (e) {
      setCancelError(e);
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div className="m-stagger">
      {/* ── greeting hero ── */}
      <div className="m-hero">
        <ArtSun size={72} className="m-hero-art" />
        <div className="m-hero-eyebrow">{t('app.name')}</div>
        <h1 className="m-hero-title">
          {t(greetingKey())}, {profile.name.split(' ')[0]}
        </h1>
        <p className="m-hero-sub">
          {profile.village ? pick(profile.village, 'name') : ''} · {dateStr}
        </p>
        <div className="m-hero-bottom">
          <div className="m-scallops" />
        </div>
      </div>

      {/* ── active request ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activeRequest ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="m-live">{t('saathi.liveToken')}</span>
              <button type="button" className="m-chip" onClick={reload} disabled={refreshing} aria-label={t('common.refresh')}>
                <Icon name="refresh" size={14} className={refreshing ? 'm-anim-sway' : ''} /> {t('common.refresh')}
              </button>
            </div>
            <Link to={`/requests/${activeRequest.id}`} style={{ textDecoration: 'none' }}>
              <TicketCard request={activeRequest} queue={activeQueue} />
            </Link>
            <div className="m-btn-row">
              <MBtn to={`/requests/${activeRequest.id}`} variant="primary" size="sm" icon={<Icon name="ticket" size={16} />}>{t('farmer.viewToken')}</MBtn>
              <MBtn to={`/requests/${activeRequest.id}/status`} variant="soft" size="sm" icon={<Icon name="clipboard" size={16} />}>{t('farmer.viewStatus')}</MBtn>
            </div>
            <button type="button" className="text-button" style={{ color: 'var(--m-red)', fontWeight: 700, alignSelf: 'center' }} onClick={() => setConfirmCancel(true)}>
              {t('farmer.cancelRequest')}
            </button>
          </>
        ) : (
          <MCard className="gold" style={{ textAlign: 'center' }}>
            <ArtFarmer size={92} className="m-anim-pop" style={{ margin: '0 auto' }} />
            <div className="m-state-title" style={{ marginTop: 6 }}>{t('farmer.noActive')}</div>
            <p style={{ color: 'var(--m-ink-soft)', fontSize: 14.5, margin: '4px 0 14px' }}>{t('farmer.noActiveHint')}</p>
            <MBtn to="/requests/new" variant="primary" icon={<Icon name="plus" size={18} />}>{t('farmer.createRequest')}</MBtn>
          </MCard>
        )}
      </div>

      {/* ── quick actions ── */}
      <SectionH title={t('farmer.quickActions')} art={<ArtWheat size={26} />} />
      <div className="m-actions-grid">
        {ACTIONS.map((a) => (
          <Link key={a.to + a.key} to={a.to} className={`m-action ${a.tone}`}>
            <span className="m-action-ico"><Icon name={a.icon} size={24} strokeWidth={2} /></span>
            <span>{t(a.key)}</span>
          </Link>
        ))}
      </div>

      {/* ── notifications ── */}
      <SectionH
        title={t('farmer.notifications')}
        hint={unread > 0 ? `${unread}` : undefined}
      />
      <MCard plain id="inbox">
        {notifications.length === 0 ? (
          <MEmpty
            art={<ArtField size={150} />}
            title={t('farmer.noNotifications')}
          />
        ) : (
          <>
            {notifications.slice(0, 6).map((n) => (
              <div key={n.id} className={`m-note-row ${n.read ? '' : 'unread'}`}>
                <span className="m-note-ico"><Icon name="bell" size={19} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="m-note-title">{pick(n, 'message')}</div>
                  <div className="m-note-time">{new Date(n.createdAt).toLocaleString(lang === 'en' ? 'en-IN' : lang === 'hi' ? 'hi-IN' : 'or-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
            {unread > 0 && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button
                  type="button"
                  className="text-button"
                  onClick={async () => { await notificationService.readAll(); reload(); }}
                >
                  ✓ {t('farmer.markAllRead')}
                </button>
              </div>
            )}
          </>
        )}
      </MCard>

      {/* ── saathi tip ── */}
      <MCard className="leaf">
        <div className="m-card-h">
          <ArtLeafPair size={18} /> {t('saathi.tipTitle')}
        </div>
        <p style={{ fontSize: 14.5, color: 'var(--m-ink)' }}>{t(tip)}</p>
      </MCard>

      <MConfirm
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        title={t('farmer.cancelRequest')}
        sub={cancelError ? cancelError.message : t('farmer.cancelConfirm')}
        confirmLabel={t('common.confirm')}
        danger
        busy={cancelBusy}
      />
    </div>
  );
}
