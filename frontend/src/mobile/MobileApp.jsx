// Annadata Connect — the Android app frontend.
//
// A completely separate UI from the website: bottom tab navigation,
// soft layered cards, the brand emblem kit, Plus Jakarta Sans / Inter type.
// It reuses the same auth, i18n, polling hooks and API services, so the
// app and website stay feature-identical by construction.
import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth, homeFor } from '../auth/AuthContext.jsx';
import { I18nProvider, useI18n } from '../i18n/I18nContext.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';
import Icon from '../components/Icon.jsx';
import { answer } from '../assistant/brain.js';
import { ArtSun } from './art.jsx';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { SplashScreen } from '../components/SplashScreen.jsx';
import { notificationService } from '../services/api/farmerService.js';
import { usePoll } from '../hooks/usePoll.js';
import { MLoader, Sheet, useOffline } from './ui.jsx';

import Welcome from './pages/Welcome.jsx';
import Home from './pages/Home.jsx';
import NewRequest from './pages/NewRequest.jsx';
import SmartSell from './pages/SmartSell.jsx';
import Token from './pages/Token.jsx';
import Status from './pages/Status.jsx';
import History from './pages/History.jsx';
import IdCard from './pages/IdCard.jsx';
import Centres from './pages/Centres.jsx';
import Prices from './pages/Prices.jsx';
import Account from './pages/Account.jsx';
import OfficerHome from './pages/OfficerHome.jsx';
import OfficerQueue from './pages/OfficerQueue.jsx';
import OfficerRequests from './pages/OfficerRequests.jsx';
import OfficerAssisted from './pages/OfficerAssisted.jsx';
import AuthorityHome from './pages/AuthorityHome.jsx';
import AuthorityCentre from './pages/AuthorityCentre.jsx';
import AuthoritySimulator from './pages/AuthoritySimulator.jsx';
import NotFound from './pages/NotFound.jsx';

/* ── Route guard with the app's own loading art ─────────────────── */
function MProtected({ roles, children }) {
  const { isAuthenticated, role, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <MLoader />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

/* ── Bottom tab bar per role ────────────────────────────────────── */
const TABS = {
  farmer: [
    { to: '/farmer', key: 'nav.dashboard', icon: 'home', end: true },
    { to: '/history', key: 'nav.history', icon: 'folder' },
    { to: '/requests/new', add: true, icon: 'plus' },
    { to: '/market-prices', key: 'nav.marketPrices', icon: 'chart' },
    { to: '/account', key: 'nav.more', icon: 'user' },
  ],
  officer: [
    { to: '/officer', key: 'nav.dashboard', icon: 'home', end: true },
    { to: '/officer/queue', key: 'nav.queue', icon: 'list' },
    { to: '/officer/assisted', add: true, icon: 'plus' },
    { to: '/officer/requests', key: 'nav.requests', icon: 'clipboard' },
    { to: '/account', key: 'nav.more', icon: 'user' },
  ],
  authority: [
    { to: '/authority', key: 'nav.overview', icon: 'grid', end: true },
    { to: '/centres', key: 'nav.centres', icon: 'store' },
    { to: '/market-prices', key: 'nav.marketPrices', icon: 'chart' },
    { to: '/account', key: 'nav.more', icon: 'user' },
  ],
};

function TabBar() {
  const { role } = useAuth();
  const { t } = useI18n();
  const tabs = TABS[role] || TABS.farmer;
  return (
    <nav className="m-tabbar" aria-label={t('nav.dashboard')}>
      {tabs.map((tab) => {
        if (tab.add) {
          return (
            <NavLink key={tab.to} to={tab.to} aria-label={t('farmer.createRequest')} className={({ isActive }) => `m-tab-add${isActive ? ' active' : ''}`}>
              <Icon name={tab.icon} size={26} strokeWidth={2.6} />
            </NavLink>
          );
        }
        return (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `m-tab${isActive ? ' active' : ''}`}>
            <Icon name={tab.icon} size={22} strokeWidth={2.1} />
            <span>{t(tab.key)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

/* ── Top app bar ────────────────────────────────────────────────── */
function AppBar() {
  const { user, role } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const home = homeFor(role);
  const isHome = location.pathname === home;
  const title = headerTitle(location.pathname, t);
  const avatar = (
    <Link to="/account" className="m-avatar" aria-label={t('nav.more')}>
      {(user?.name || '?').trim().charAt(0).toUpperCase()}
    </Link>
  );
  const goBack = () => {
    // Deep links may land with no in-app history — fall back to the role home.
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(home);
  };

  return (
    <header className={`m-appbar${isHome ? ' is-home' : ''}`}>
      {isHome ? (
        <>
          <span className="m-appbar-mark"><BrandLogo size={30} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="m-appbar-title">
              <span className="m-appbar-brand">{t('saathi.brandFirst')} <span className="m-appbar-brand-accent">{t('saathi.brandSecond')}</span></span>
            </div>
            <div className="m-appbar-sub">
              <span className="m-live-pill"><i /> {t('saathi.livePill')}</span>
              <span className="m-appbar-tag">{title}</span>
            </div>
          </div>
          {role === 'farmer' && <NotificationBell />}
          {avatar}
        </>
      ) : (
        <>
          <button type="button" className="m-back" onClick={goBack} aria-label={t('common.back')}>
            <Icon name="arrowLeft" size={20} strokeWidth={2.2} />
          </button>
          <div className="m-appbar-title m-appbar-page-title">{title}</div>
          {avatar}
        </>
      )}
    </header>
  );
}

/* Unread-count bell — a glanceable indicator; taps jump to the inbox on Home. */
function NotificationBell() {
  const { t } = useI18n();
  const { data } = usePoll(() => notificationService.list(), { intervalMs: 20000 });
  const unread = data?.unreadCount || 0;
  return (
    <Link to="/farmer#inbox" className="m-bell" aria-label={`${t('farmer.notifications')}${unread ? ` (${unread})` : ''}`}>
      <Icon name="bell" size={20} strokeWidth={2} />
      {unread > 0 && <span className="m-bell-dot" aria-hidden="true" />}
    </Link>
  );
}

function headerTitle(pathname, t) {
  if (pathname === '/account') return t('nav.more');
  if (pathname === '/requests/new') return t('farmer.newRequestTitle');
  if (pathname === '/sell') return t('nav.smartSell');
  if (pathname === '/history') return t('farmer.recordsTitle');
  if (pathname === '/id-card') return t('nav.idCard');
  if (pathname === '/centres') return t('nav.centres');
  if (pathname === '/market-prices') return t('nav.marketPrices');
  if (/^\/requests\/[^/]+\/status$/.test(pathname)) return t('farmer.statusJourney');
  if (/^\/requests\/[^/]+$/.test(pathname)) return t('farmer.yourToken');
  if (pathname === '/officer/queue') return t('nav.queue');
  if (pathname === '/officer/requests') return t('nav.requests');
  if (pathname === '/officer/assisted') return t('nav.assisted');
  if (pathname === '/authority/simulator') return t('simulator.title');
  if (/^\/authority\/centres\//.test(pathname)) return t('authority.centreDetails');
  return t('nav.dashboard');
}

/* ── Farmer assistant (rule-based FAQ, same brain as the website) ── */
function AssistantFab() {
  const { role } = useAuth();
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) setMessages([{ from: 'bot', text: t('assistant.greeting') }]);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  function send(text) {
    const q = (text ?? input).trim();
    if (!q) return;
    const reply = answer(q, lang) || t('assistant.fallback');
    setMessages((m) => [...m, { from: 'me', text: q }, { from: 'bot', text: reply }]);
    setInput('');
  }

  if (role !== 'farmer') return null;

  return (
    <>
      <button type="button" className="m-fab-assist" onClick={() => setOpen(true)} aria-label={t('assistant.title')}>
        <ArtSun size={26} />
        {t('assistant.fab')}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t('assistant.title')} sub={t('assistant.subtitle')}>
        <div className="m-chat-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={`m-msg ${m.from === 'me' ? 'me' : 'bot'}`}>{m.text}</div>
          ))}
          {messages.length <= 1 && (
            <div className="m-chip-row" style={{ paddingTop: 4 }}>
              {(t('assistant.chips') || []).slice(0, 3).map((chip) => (
                <button key={chip} type="button" className="m-chip" onClick={() => send(chip)}>{chip}</button>
              ))}
            </div>
          )}
        </div>
        <form
          className="m-chat-form"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <input
            ref={inputRef}
            className="m-input"
            placeholder={t('assistant.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label={t('assistant.placeholder')}
          />
          <button type="submit" className="m-send" aria-label={t('assistant.send')}>
            <Icon name="send" size={19} />
          </button>
        </form>
      </Sheet>
    </>
  );
}

/* ── App shell (everything behind login) ────────────────────────── */
function MobileShell() {
  const offline = useOffline();
  const { t } = useI18n();
  const isPreview = typeof window !== 'undefined' && !window.Capacitor?.isNativePlatform?.();

  return (
    <div className="m-shell">
      {isPreview && <div className="m-preview-banner">{t('saathi.previewBanner')}</div>}
      <AppBar />
      {offline && (
        <div className="m-banner warning" role="status" style={{ margin: '10px 16px 0' }}>
          <Icon name="wifiOff" size={17} />
          {t('common.offlineBanner')}
        </div>
      )}
      <main className="m-page">
        <Outlet />
      </main>
      <AssistantFab />
      <TabBar />
    </div>
  );
}

/* '/' is the farmer home; staff roles are routed to their dashboards. */
function FarmerHome() {
  const { role } = useAuth();
  if (role === 'officer') return <Navigate to="/officer" replace />;
  if (role === 'authority') return <Navigate to="/authority" replace />;
  return <Home />;
}

export function MobileApp() {
  return (
    <div className="m-root">
      <I18nProvider>
        <SplashScreen />
        <AuthProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Welcome />} />
                <Route path="/login" element={<Welcome />} />
                <Route path="/register" element={<Welcome registration />} />

                {/* App */}
                <Route element={<MProtected><MobileShell /></MProtected>}>
                  <Route path="/account" element={<Account />} />
                  <Route path="/farmer" element={<MProtected roles={['farmer']}><FarmerHome /></MProtected>} />
                  <Route path="/requests/new" element={<MProtected roles={['farmer']}><NewRequest /></MProtected>} />
                  <Route path="/sell" element={<MProtected roles={['farmer']}><SmartSell /></MProtected>} />
                  <Route path="/requests/:id" element={<MProtected roles={['farmer']}><Token /></MProtected>} />
                  <Route path="/requests/:id/status" element={<MProtected roles={['farmer']}><Status /></MProtected>} />
                  <Route path="/history" element={<MProtected roles={['farmer']}><History /></MProtected>} />
                  <Route path="/id-card" element={<MProtected roles={['farmer']}><IdCard /></MProtected>} />
                  <Route path="/centres" element={<Centres />} />
                  <Route path="/market-prices" element={<Prices />} />
                  {/* Officer */}
                  <Route path="/officer" element={<MProtected roles={['officer']}><OfficerHome /></MProtected>} />
                  <Route path="/officer/queue" element={<MProtected roles={['officer']}><OfficerQueue /></MProtected>} />
                  <Route path="/officer/requests" element={<MProtected roles={['officer']}><OfficerRequests /></MProtected>} />
                  <Route path="/officer/assisted" element={<MProtected roles={['officer']}><OfficerAssisted /></MProtected>} />
                  {/* Authority */}
                  <Route path="/authority" element={<MProtected roles={['authority']}><AuthorityHome /></MProtected>} />
                  <Route path="/authority/simulator" element={<MProtected roles={['authority']}><AuthoritySimulator /></MProtected>} />
                  <Route path="/authority/centres/:id" element={<MProtected roles={['authority']}><AuthorityCentre /></MProtected>} />
                  <Route path="/unauthorized" element={<NotFound />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </I18nProvider>
    </div>
  );
}
