// Farmer ID card — a keepsake passbook-style card with QR, shareable by print.
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { farmerService } from '../../services/api/farmerService.js';
import { formatDate } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtIdBadge } from '../art.jsx';
import { MCard, MLoader, MError, MBtn } from '../ui.jsx';

export default function IdCard() {
  const { t, lang, pick } = useI18n();
  const { data: card, error, reload } = usePoll(() => farmerService.idCard());

  if (error) return <MError error={error} onRetry={reload} />;
  if (!card) return <MLoader />;

  return (
    <div className="m-stagger" style={{ textAlign: 'center' }}>
      <ArtIdBadge size={80} className="m-anim-pop" style={{ margin: '4px auto' }} />
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>{t('idCard.title')}</h2>
      <p style={{ color: 'var(--m-ink-soft)', fontSize: 14, marginBottom: 14 }}>{t('idCard.hint')}</p>

      <div className="m-idcard" style={{ textAlign: 'left' }}>
        <div className="m-id-head">
          <Icon name="wheat" size={26} />
          <div style={{ flex: 1 }}>
            <div className="m-display" style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{t('saathi.name')} · {t('app.name')}</div>
            <div style={{ fontSize: 11.5, color: '#cfe2cd', fontWeight: 600 }}>{t('idCard.cardLabel')}</div>
          </div>
          <span className="m-badge gold">Gov</span>
        </div>

        <div className="m-id-body">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="m-id-name">{card.name}</div>
            <div style={{ margin: '8px 0 4px' }}>
              <div className="m-id-line"><span>{t('idCard.farmerId')}</span><strong>{card.farmerId}</strong></div>
              <div className="m-id-line"><span>{t('idCard.mobile')}</span><strong>{card.phone || t('auth.notLinked')}</strong></div>
              <div className="m-id-line"><span>{t('idCard.village')}</span><strong>{card.village ? pick(card.village, 'name') : '—'} · {card.district}</strong></div>
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--m-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('idCard.crops')}</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                {card.crops.length === 0 && <em style={{ fontSize: 13, color: 'var(--m-ink-faint)' }}>{t('idCard.noCrops')}</em>}
                {card.crops.map((c) => (
                  <span key={c.id} className="m-badge success">{pick(c, 'name')}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: 'none' }}>
            <img src={card.qrDataUrl} alt={t('idCard.qrAlt')} width={96} height={96} style={{ borderRadius: 12, border: '2px solid var(--m-line)' }} />
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--m-ink-faint)', marginTop: 4 }}>{t('idCard.qrCaption')}</div>
          </div>
        </div>

        <div className="m-id-foot">
          <span>{t('landing.helpline')} 155266</span>
          <span>{t('idCard.issued')} {card.registeredAt ? formatDate(card.registeredAt, lang) : '—'}</span>
        </div>
      </div>

      <MCard plain style={{ marginTop: 14 }}>
        <MBtn block variant="primary" onClick={() => window.print()} icon={<Icon name="print" size={18} />}>
          {t('idCard.print')}
        </MBtn>
        <p style={{ fontSize: 12, color: 'var(--m-ink-faint)', marginTop: 10 }}>{t('idCard.printNote')}</p>
      </MCard>
    </div>
  );
}
