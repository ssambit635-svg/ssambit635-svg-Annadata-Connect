import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth, homeFor } from './auth/AuthContext.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
// AppShell is lazy so the portal stylesheets it imports stay out of the
// public landing/login CSS path.
const AppShell = lazy(() => import('./components/AppShell.jsx').then((m) => ({ default: m.AppShell })));
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { NetworkBanner } from './components/NetworkBanner.jsx';
// Route pages are code-split: the landing visitor no longer downloads the
// officer/authority dashboards (and vice versa) in the first bundle.
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'));
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard.jsx'));
const NewRequestPage = lazy(() => import('./pages/farmer/NewRequestPage.jsx'));
const SmartSellPage = lazy(() => import('./pages/farmer/SmartSellPage.jsx'));
const TokenPage = lazy(() => import('./pages/farmer/TokenPage.jsx'));
const StatusPage = lazy(() => import('./pages/farmer/StatusPage.jsx'));
const CentresPage = lazy(() => import('./pages/farmer/CentresPage.jsx'));
const HistoryPage = lazy(() => import('./pages/farmer/HistoryPage.jsx'));
const IdCardPage = lazy(() => import('./pages/farmer/IdCardPage.jsx'));
const OfficerDashboard = lazy(() => import('./pages/officer/OfficerDashboard.jsx'));
const OfficerQueue = lazy(() => import('./pages/officer/OfficerQueue.jsx'));
const OfficerRequests = lazy(() => import('./pages/officer/OfficerRequests.jsx'));
const AssistedRequest = lazy(() => import('./pages/officer/AssistedRequest.jsx'));
const AuthorityDashboard = lazy(() => import('./pages/authority/AuthorityDashboard.jsx'));
const StateOverview = lazy(() => import('./pages/authority/StateOverview.jsx'));
const AuthorityCentreDetail = lazy(() => import('./pages/authority/AuthorityCentreDetail.jsx'));
const AuthoritySimulator = lazy(() => import('./pages/authority/AuthoritySimulator.jsx'));
const MarketPricesPage = lazy(() => import('./pages/MarketPricesPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/ErrorPages.jsx').then((m) => ({ default: m.NotFoundPage })));
const UnauthorizedPage = lazy(() => import('./pages/ErrorPages.jsx').then((m) => ({ default: m.UnauthorizedPage })));

// '/' is the farmer home; officers/authority are routed to their dashboards.
function FarmerHome() {
  const { role } = useAuth();
  if (role === 'officer') return <Navigate to="/officer" replace />;
  if (role === 'authority') return <Navigate to="/authority" replace />;
  return <FarmerDashboard />;
}

function WebApp() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ErrorBoundary>
        <BrowserRouter>
          <NetworkBanner />
          <Suspense fallback={<div role="status" style={{ padding: '2rem', textAlign: 'center' }}>Annadata Connect…</div>}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/account" element={<AccountPage />} />
              {/* Farmer */}
              <Route path="/farmer" element={<ProtectedRoute roles={['farmer']}><FarmerHome /></ProtectedRoute>} />
              <Route path="/requests/new" element={<ProtectedRoute roles={['farmer']}><NewRequestPage /></ProtectedRoute>} />
              <Route path="/sell" element={<ProtectedRoute roles={['farmer']}><SmartSellPage /></ProtectedRoute>} />
              <Route path="/requests/:id" element={<ProtectedRoute roles={['farmer']}><TokenPage /></ProtectedRoute>} />
              <Route path="/requests/:id/status" element={<ProtectedRoute roles={['farmer']}><StatusPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute roles={['farmer']}><HistoryPage /></ProtectedRoute>} />
              <Route path="/id-card" element={<ProtectedRoute roles={['farmer']}><IdCardPage /></ProtectedRoute>} />
              <Route path="/centres" element={<ProtectedRoute roles={['farmer', 'officer', 'authority']}><CentresPage /></ProtectedRoute>} />
              {/* Historical Agmarknet mandi prices - open to every signed-in role */}
              <Route path="/market-prices" element={<ProtectedRoute roles={['farmer', 'officer', 'authority']}><MarketPricesPage /></ProtectedRoute>} />
              {/* Officer */}
              <Route path="/officer" element={<ProtectedRoute roles={['officer']}><OfficerDashboard /></ProtectedRoute>} />
              <Route path="/officer/queue" element={<ProtectedRoute roles={['officer']}><OfficerQueue /></ProtectedRoute>} />
              <Route path="/officer/requests" element={<ProtectedRoute roles={['officer']}><OfficerRequests /></ProtectedRoute>} />
              <Route path="/officer/assisted" element={<ProtectedRoute roles={['officer']}><AssistedRequest /></ProtectedRoute>} />
              {/* Authority */}
              <Route path="/authority" element={<ProtectedRoute roles={['authority']}><AuthorityDashboard /></ProtectedRoute>} />
              <Route path="/authority/state" element={<ProtectedRoute roles={['authority']}><StateOverview /></ProtectedRoute>} />
              <Route path="/authority/simulator" element={<ProtectedRoute roles={['authority']}><AuthoritySimulator /></ProtectedRoute>} />
              <Route path="/authority/centres/:id" element={<ProtectedRoute roles={['authority']}><AuthorityCentreDetail /></ProtectedRoute>} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </I18nProvider>
  );
}

export default WebApp;
