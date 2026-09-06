import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { LanguageToggle } from './LanguageToggle.jsx';
import { AssistantWidget } from './AssistantWidget.jsx';
import Icon from './Icon.jsx';

// Icons for every nav entry so the mobile tab bar can show them too.
const NAV = {
  farmer: [
    { to: '/farmer', key: 'nav.dashboard', icon: 'home', end: true },
    { to: '/requests/new', key: 'nav.newRequest', icon: 'plus' },
    { to: '/sell', key: 'nav.smartSell', icon: 'rupee' },
    { to: '/market-prices', key: 'nav.marketPrices', icon: 'chart' },
    { to: '/history', key: 'nav.history', icon: 'folder' },
    { to: '/id-card', key: 'nav.idCard', icon: 'idCard' },
  ],
  officer: [
    { to: '/officer', key: 'nav.dashboard', icon: 'home', end: true },
    { to: '/officer/queue', key: 'nav.queue', icon: 'list' },
    { to: '/officer/requests', key: 'nav.requests', icon: 'clipboard' },
    { to: '/officer/assisted', key: 'nav.assisted', icon: 'users' },
    { to: '/market-prices', key: 'nav.marketPrices', icon: 'chart' },
  ],
  authority: [
    { to: '/authority', key: 'nav.overview', icon: 'grid', end: true },
    { to: '/centres', key: 'nav.centres', icon: 'store' },
    { to: '/market-prices', key: 'nav.marketPrices', icon: 'chart' },
  ],
};

// Bottom tab bar shows at most 5 entries; anything beyond goes into "More".
const MAX_TABS = 5;

export function AppShell() {
  const { user, role, logout } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = NAV[role] || NAV.farmer;
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the account menu on outside click / Escape.
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

  // Close the "More" sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const tabs = navItems.slice(0, MAX_TABS);
  const overflow = navItems.slice(MAX_TABS);
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

  function doLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

  return (
    <>
      <header className="app-header">
        <Link to={homeFor(user?.role)} className="brand" aria-label="Annadata Connect home">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="wheat" size={24} strokeWidth={2} />
          </span>
          <span className="brand-text">
            <span className="hi" lang={lang}>{lang === 'en' ? 'Annadata Connect' : t('app.name')}</span>
            <span className="en">{lang === 'en' ? t('app.tagline') : 'Annadata Connect'}</span>
          </span>
        </Link>

        <div className="header-tools">
          <div className="header-desktop-only">
            <LanguageToggle />
          </div>

          {user && (
            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-menu-btn"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={t('nav.accountMenu')}
              >
                <span className="user-avatar" aria-hidden="true">{initial}</span>
                <span className="user-menu-name">{user.name}</span>
                <Icon name="chevronDown" size={16} className={`user-menu-caret${menuOpen ? ' is-open' : ''}`} />
              </button>

              {menuOpen && (
                <div className="user-menu-pop" role="menu" aria-label={t('nav.accountMenu')}>
                  <div className="user-menu-id">
                    <strong>{user.name}</strong>
                    <span className={`badge neutral`}>{t(`common.${role}`)}</span>
                  </div>
                  <div className="user-menu-row">
                    <span className="user-menu-row-label">{t('landing.languageLabel')}</span>
                    <LanguageToggle className="lang-toggle on-light" />
                  </div>
                  <Link to="/account" className="btn btn-outline btn-sm user-menu-logout" role="menuitem"><Icon name="lock" size={16} /> {t('auth.accountTitle')}</Link>
                  <button type="button" className="btn btn-outline btn-sm user-menu-logout" onClick={doLogout} role="menuitem">
                    <Icon name="logout" size={16} /> {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <nav className="app-nav" aria-label={t('landing.primaryNav')}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {t(item.key)}
          </NavLink>
        ))}
      </nav>

      <main className="page" id="portal-main">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar (hidden on larger screens via CSS) */}
      <nav className="bottom-tabs" aria-label={t('landing.primaryNav')}>
        {tabs.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
          >
            <Icon name={item.icon} size={22} strokeWidth={1.9} />
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
        {overflow.length > 0 && (
          <button type="button" className={`tab tab-more${moreOpen ? ' active' : ''}`} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
            <Icon name="more" size={22} />
            <span>{t('nav.more')}</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="sheet-scrim" onClick={() => setMoreOpen(false)} aria-hidden="true" />
      )}
      {moreOpen && (
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
          <button type="button" className="btn btn-outline more-sheet-close" onClick={() => setMoreOpen(false)}>
            {t('common.close')}
          </button>
        </div>
      )}

      <AssistantWidget />
    </>
  );
}
