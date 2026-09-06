// 404 / unauthorized — a plain service notice with a route back.
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useAuth, homeFor } from '../../auth/AuthContext.jsx';
import { ArtWayfind } from '../art.jsx';
import { MBtn } from '../ui.jsx';

export default function NotFound() {
  const { t } = useI18n();
  const { user } = useAuth();
  const home = user ? homeFor(user.role) : '/login';
  return (
    <div className="m-state" style={{ padding: '70px 20px 40px' }}>
      <ArtWayfind size={104} className="m-anim-pop" />
      <div className="m-state-title" style={{ marginTop: 10 }}>{t('common.notFoundTitle')}</div>
      <MBtn to={home} variant="primary" style={{ marginTop: 8 }}>{t('common.goHome')}</MBtn>
    </div>
  );
}
