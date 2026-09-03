import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { LanguageToggle } from './LanguageToggle.jsx';
import { AssistantWidget } from './AssistantWidget.jsx';

const NAV = {
  farmer: [
    { to: '/farmer', key: 'nav.dashboard', end: true },
    { to: '/requests/new', key: 'nav.newRequest' },
    { to: '/history', key: 'nav.history' },
    { to: '/id-card', key: 'nav.idCard' },
  ],
  officer: [
    { to: '/officer', key: 'nav.dashboard', end: true },
    { to: '/officer/queue', key: 'nav.queue' },
    { to: '/officer/requests', key: 'nav.requests' },
    { to: '/officer/assisted', key: 'nav.assisted' },
  ],
  authority: [{ to: '/authority', key: 'nav.overview', end: true }],
};

export function AppShell() {
  const { user, role, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const navItems = NAV[role] || NAV.farmer;

  return (
    <>
      <header className="app-header">
        <Link to={homeFor(user?.role)} className="brand" aria-label="Annadata Connect home">
          <span className="hi">अन्नदाता कनेक्ट</span>
          <span className="en">Annadata Connect</span>
        </Link>
        <LanguageToggle />
        {user && (
          <span className="user-chip">
            {user.name} · {t(`common.${role}`)}
          </span>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          {t('nav.logout')}
        </button>
      </header>
      <nav className="app-nav" aria-label="Main">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {t(item.key)}
          </NavLink>
        ))}
      </nav>
      <main className="page">
        <Outlet />
      </main>
      <AssistantWidget />
    </>
  );
}
