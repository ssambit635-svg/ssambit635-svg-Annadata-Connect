import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth, homeFor } from './auth/AuthContext.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
import { AppShell } from './components/AppShell.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { NetworkBanner } from './components/NetworkBanner.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import FarmerDashboard from './pages/farmer/FarmerDashboard.jsx';
import NewRequestPage from './pages/farmer/NewRequestPage.jsx';
import SmartSellPage from './pages/farmer/SmartSellPage.jsx';
import TokenPage from './pages/farmer/TokenPage.jsx';
import StatusPage from './pages/farmer/StatusPage.jsx';
import CentresPage from './pages/farmer/CentresPage.jsx';
import HistoryPage from './pages/farmer/HistoryPage.jsx';
import IdCardPage from './pages/farmer/IdCardPage.jsx';
import OfficerDashboard from './pages/officer/OfficerDashboard.jsx';
import OfficerQueue from './pages/officer/OfficerQueue.jsx';
import OfficerRequests from './pages/officer/OfficerRequests.jsx';
import AssistedRequest from './pages/officer/AssistedRequest.jsx';
import AuthorityDashboard from './pages/authority/AuthorityDashboard.jsx';
import AuthorityCentreDetail from './pages/authority/AuthorityCentreDetail.jsx';
import AuthoritySimulator from './pages/authority/AuthoritySimulator.jsx';
import MarketPricesPage from './pages/MarketPricesPage.jsx';
import { NotFoundPage, UnauthorizedPage } from './pages/ErrorPages.jsx';
import { isAppMode, consumePreviewOverride } from './mobile/isApp.js';
import { MobileApp } from './mobile/MobileApp.jsx';

// Which frontend boots is decided once per load: the website in browsers,
// the bespoke Android app UI ("Annadata Connect") inside the Capacitor APK
// (or in a browser with the ?app=1 preview flag).
consumePreviewOverride();

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
              <Route path="/authority/simulator" element={<ProtectedRoute roles={['authority']}><AuthoritySimulator /></ProtectedRoute>} />
              <Route path="/authority/centres/:id" element={<ProtectedRoute roles={['authority']}><AuthorityCentreDetail /></ProtectedRoute>} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </I18nProvider>
  );
}

export default function App() {
  return isAppMode() ? <MobileApp /> : <WebApp />;
}
