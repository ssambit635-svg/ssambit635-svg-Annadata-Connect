import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { AssistantWidget } from './AssistantWidget.jsx';
import { ArtLogo } from '../mobile/art.jsx';
import { MLangPills } from '../mobile/ui.jsx';
import Icon from './Icon.jsx';

// Portal navigation, identical feature set to the Android app, laid out for
// laptops: a sidebar on desktop, the app's bottom tabs + top bar on mobile.
// The whole shell is wrapped in .m-root so the website interior speaks the
// exact same design language as the APK.
const NAV = {
  farmer: [
    { to: '/farmer', key: 'nav.dashboard', icon: 'home', end: true },
    { to: '/sell', key: 'farmer.sellNow', icon: 'rupee', gold: true },
    { to: '/requests/new', key: 'nav.newRequest', icon: 'plus' },
    { to: '/market-prices', key: 'nav.marketPrices', icon: 'chart' },
    { to: '/history', key: 'nav.history', icon: 'folder' },
    { to: '/id-card', key: 'nav.idCard', icon: 'idCard' },
    { to: '/centres', key: 'nav.centres', icon: 'store' },
  ],
  officer: [
    { to: '/officer', key: 'nav.dashboard', icon: 'home', end: true },
    { to: '/officer/queue', key: 'nav.queue', icon: 'list' },
    { to: '/officer/requests', key: 'nav.requests', icon: 'clipboard' },
    { to: '/officer/assisted', key: 'nav.assisted', icon: 'users' },
    { to: '/market-prices', key: 'nav.marketPrices', icon: 'chart' },
    { to: '/centres', key: 'nav.centres', icon: 'store' },
  ],
  authority: [
    { to: '/authority', key: 'nav.overview', icon: 'grid', end: true },
    { to: '/authority/state', key: 'nav.monitor', icon: 'activity', gold: true },
    { to: '/authority/simulator', key: 'nav.simulator', icon: 'activity' },
    { to: '/centres', key: 'nav.centres', icon: 'store' },
    { to: '/market-prices', key: 'nav.marketPrices', icon: 'chart' },
  ],
};

const MAX_TABS = 5;

export function AppShell() {
  const { user, role, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = NAV[role] || NAV.farmer;
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMoreOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const tabs = navItems.slice(0, MAX_TABS - (navItems.length > MAX_TABS ? 1 : 0));
  const overflow = navItems.slice(tabs.length);
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();
  const roleLabel = t(`common.${role}`);
  const home = homeFor(role);

  function doLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

  const sideNav = (vertical = true) =>
    navItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => (isActive ? 'active' : '')}
        style={vertical ? undefined : { justifyContent: 'flex-start' }}
      >
        <span className="portal-nav-ico" aria-hidden="true"><Icon name={item.icon} size={18} strokeWidth={2} /></span>
        {t(item.key)}
        {item.gold && vertical && (
          <span className="m-badge" style={{ marginLeft: 'auto', background: 'var(--m-gold-soft)', color: 'var(--m-gold-deep)' }} aria-hidden="true">★</span>
        )}
      </NavLink>
    ));

  return (
    <div className="m-root portal-shell">
      {/* ── Sidebar (desktop) ── */}
      <aside className="portal-side" aria-label={t('landing.primaryNav')}>
        <Link to={home} className="portal-brand" aria-label="Annadata Connect home">
          <ArtLogo size={42} />
          <span className="portal-brand-copy">
            <strong>{t('app.name')}</strong>
            <small>{t('landing.govStrip')}</small>
          </span>
        </Link>

        <nav className="portal-nav">
          <span className="portal-nav-label">{roleLabel}</span>
          {sideNav()}
        </nav>

        <div className="portal-side-foot">
          <div className="portal-user">
            <span className="portal-avatar" aria-hidden="true">{initial}</span>
            <span className="portal-user-copy">
              <strong>{user?.name}</strong>
              <small>{roleLabel}</small>
            </span>
          </div>
          <MLangPills variant="light" />
          <div className="m-btn-row" style={{ marginTop: 2 }}>
            <Link to="/account" className="btn btn-outline btn-sm" style={{ flex: 1 }}><Icon name="lock" size={15} /> {t('auth.accountTitle')}</Link>
            <button type="button" className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={doLogout}>
              <Icon name="logout" size={15} /> {t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>

      <div className="portal-body">
        {/* ── Top bar (mobile) ── */}
        <header className="portal-topbar">
          <Link to={home} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <ArtLogo size={34} />
            <span style={{ fontFamily: 'var(--m-f-display)', fontWeight: 800, fontSize: 16, color: 'var(--m-green-forest)' }}>
              {t('app.name')}
            </span>
          </Link>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }} ref={menuRef}>
            <button
              type="button"
              className="portal-avatar"
              style={{ border: 'none', width: 38, height: 38, cursor: 'pointer' }}
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={t('nav.accountMenu')}
            >
              {initial}
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-label={t('nav.accountMenu')}
                style={{
                  position: 'absolute',
                  top: 58,
                  right: 12,
                  left: 12,
                  zIndex: 70,
                  background: 'var(--m-paper)',
                  border: '1px solid var(--m-line)',
                  borderRadius: 16,
                  boxShadow: 'var(--m-shadow-pop)',
                  padding: 12,
                }}
              >
                <div style={{ padding: '4px 6px 10px', borderBottom: '1px solid var(--m-line)', marginBottom: 8 }}>
                  <strong style={{ display: 'block', fontSize: 15 }}>{user?.name}</strong>
                  <span className="badge neutral" style={{ marginTop: 2 }}>{roleLabel}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Link to="/account" className="btn btn-outline btn-sm"><Icon name="lock" size={15} /> {t('auth.accountTitle')}</Link>
                  <button type="button" className="btn btn-danger btn-sm" onClick={doLogout}><Icon name="logout" size={15} /> {t('nav.logout')}</button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="portal-content" id="portal-main">
          <Outlet />
        </main>
      </div>

      {/* ── Bottom tabs (mobile) ── */}
      <nav className="portal-bottom" aria-label={t('landing.primaryNav')}>
        <div className="m-tabbar" style={{ maxWidth: 520, margin: '0 auto' }}>
          {tabs.map((item) =>
            item.gold ? (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `m-tab-add${isActive ? ' active' : ''}`}
                aria-label={t(item.key)}
              >
                <Icon name={item.icon} size={26} strokeWidth={2.6} />
              </NavLink>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `m-tab${isActive ? ' active' : ''}`}
              >
                <Icon name={item.icon} size={22} strokeWidth={2.1} />
                <span>{t(item.key)}</span>
              </NavLink>
            )
          )}
          {overflow.length > 0 && (
            <button type="button" className={`m-tab${moreOpen ? ' active' : ''}`} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
              <Icon name="more" size={22} />
              <span>{t('nav.more')}</span>
            </button>
          )}
        </div>
      </nav>

      {moreOpen && (
        <>
          <div className="sheet-scrim" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="more-sheet" role="dialog" aria-modal="true" aria-label={t('nav.more')}>
            <div className="more-sheet-handle" aria-hidden="true" />
            <h2>{t('nav.more')}</h2>
            {overflow.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `more-sheet-row${isActive ? ' active' : ''}`}
              >
                <span className="more-sheet-icon"><Icon name={item.icon} size={19} /></span>
                {t(item.key)}
                <Icon name="arrowUpRight" size={16} className="more-sheet-caret" />
              </NavLink>
            ))}
            <button type="button" className="btn btn-outline btn-block more-sheet-close" onClick={() => setMoreOpen(false)}>
              {t('common.close')}
            </button>
          </div>
        </>
      )}

      <AssistantWidget />
    </div>
  );
}
