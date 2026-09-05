import { Navigate, useLocation } from 'react-router-dom';
import { Loading } from './States.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

// Route guard: authentication + optional role restriction.
// UI-level convenience only — the backend enforces authorization on every call.
export function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, role, initializing } = useAuth();
  const location = useLocation();
  const { t } = useI18n();

  if (initializing) return <Loading label={t('common.loading')} />;

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/unauthorized" replace />;
  return children;
}
