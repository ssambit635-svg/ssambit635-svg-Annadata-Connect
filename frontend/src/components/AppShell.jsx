import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { AssistantWidget } from './AssistantWidget.jsx';
import { ArtLogo } from '../mobile/art.jsx';
import Icon from './Icon.jsx';

// Portal chrome shared by every signed-in page.
//   • ≥1024px  — a fixed sidebar: brand, role nav, and an account block with
//                the language switch, an "Account" row and a Sign out row.
//   • <1024px  — a compact top bar with an avatar menu, plus the app's bottom
//                tab bar (max 5 tabs, the rest in a "More" sheet).
// Everything lives under .m-root.portal-shell so the app design tokens apply.
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
    { to: '/authority/simulator', key: 'nav.simulator', icon: 'target' },
    { to: '/centres', key: 'nav.centres', icon: 'store' },
    { to: '/market-prices', key: 'nav.marketPrices', icon: 'chart' },
  ],
};

const MAX_TABS = 5;

function LangSwitch({ compact }) {
  const { lang, setLang, languages } = useI18n();
  return (
    <div className={`portal-lang${compact ? ' compact' : ''}`} role="group" aria-label="Language">
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          className={lang === l.code ? 'active' : ''}
          aria-pressed={lang === l.code}
          title={l.native}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

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

  // Lock page scroll while the More sheet is open (matches the app's sheets).
  useEffect(() => {
    if (!moreOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  const tabs = navItems.slice(0, MAX_TABS - (navItems.length > MAX_TABS ? 1 : 0));
  const overflow = navItems.slice(tabs.length);
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();
  const roleLabel = t(`common.${role}`);
  const home = homeFor(role);
  const onAccount = location.pathname === '/account';

  function doLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

  return (
    <div className="m-root portal-shell">
      {/* ── Sidebar (desktop) ── */}
      <aside className="portal-side">
        <Link to={home} className="portal-brand" aria-label={t('app.name')}>
          <ArtLogo size={40} />
          <span className="portal-brand-copy">
            <strong>{t('app.name')}</strong>
            <small>{t('landing.portalLabel')}</small>
          </span>
        </Link>

        <nav className="portal-nav" aria-label={t('nav.dashboard')}>
          <span className="portal-nav-label">{roleLabel}</span>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="portal-nav-ico" aria-hidden="true"><Icon name={item.icon} size={18} strokeWidth={2} /></span>
              <span className="portal-nav-text">{t(item.key)}</span>
              {item.gold && <span className="portal-nav-star" aria-hidden="true"><Icon name="star" size={13} strokeWidth={2.4} /></span>}
            </NavLink>
          ))}
        </nav>

        <div className="portal-side-foot">
          <LangSwitch />
          <div className="portal-user">
            <span className="portal-avatar" aria-hidden="true">{initial}</span>
            <span className="portal-user-copy">
              <strong>{user?.name}</strong>
              <small>{roleLabel}</small>
            </span>
          </div>
          <Link to="/account" className={`portal-foot-row${onAccount ? ' active' : ''}`}>
            <Icon name="user" size={17} />
            <span>{t('nav.account')}</span>
            <Icon name="arrowUpRight" size={14} className="portal-foot-caret" />
          </Link>
          <button type="button" className="portal-foot-row signout" onClick={doLogout}>
            <Icon name="logout" size={17} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      <div className="portal-body">
        {/* ── Top bar (mobile / tablet) ── */}
        <header className="portal-topbar">
          <Link to={home} className="portal-topbar-brand" aria-label={t('app.name')}>
            <ArtLogo size={34} />
            <span>{t('app.name')}</span>
          </Link>
          <div className="portal-topbar-actions" ref={menuRef}>
            <button
              type="button"
              className="portal-avatar portal-avatar-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={t('nav.accountMenu')}
            >
              {initial}
            </button>
            {menuOpen && (
              <div className="portal-menu" role="menu" aria-label={t('nav.accountMenu')}>
                <div className="portal-menu-head">
                  <span className="portal-avatar" aria-hidden="true">{initial}</span>
                  <span className="portal-user-copy">
                    <strong>{user?.name}</strong>
                    <small>{roleLabel}</small>
                  </span>
                </div>
                <LangSwitch compact />
                <Link to="/account" role="menuitem" className="portal-foot-row">
                  <Icon name="user" size={17} />
                  <span>{t('nav.account')}</span>
                  <Icon name="arrowUpRight" size={14} className="portal-foot-caret" />
                </Link>
                <button type="button" role="menuitem" className="portal-foot-row signout" onClick={doLogout}>
                  <Icon name="logout" size={17} />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="portal-content" id="portal-main">
          <Outlet />
        </main>
      </div>

      {/* ── Bottom tabs (mobile) ── */}
      <nav className="portal-bottom" aria-label={t('nav.dashboard')}>
        <div className="m-tabbar">
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
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `m-tab${isActive ? ' active' : ''}`}>
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
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `more-sheet-row${isActive ? ' active' : ''}`}>
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
