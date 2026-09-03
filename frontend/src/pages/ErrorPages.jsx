import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useAuth, homeFor } from '../auth/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

export function UnauthorizedPage() {
  const { t } = useI18n();
  const { role } = useAuth();
  return (
    <div className="state" style={{ paddingTop: '4rem' }}>
      <div className="icon"><Icon name="lock" size={34} /></div>
      <h1>{t('common.notAllowed')}</h1>
      <Link className="btn btn-primary" to={homeFor(role)}>{t('common.goHome')}</Link>
    </div>
  );
}

export function NotFoundPage() {
  const { t } = useI18n();
  const { role } = useAuth();
  return (
    <div className="state" style={{ paddingTop: '4rem' }}>
      <div className="icon"><Icon name="wheat" size={34} /></div>
      <h1>{t('common.notFoundTitle')}</h1>
      <Link className="btn btn-primary" to={homeFor(role)}>{t('common.goHome')}</Link>
    </div>
  );
}
